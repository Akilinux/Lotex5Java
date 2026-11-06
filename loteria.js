const fs = require('fs').promises;
const path = require('path');

class LoteriaApp {
    constructor() {
        this.dataFile = path.join(__dirname, 'loteria_data.json');
        this.nombreSorteo = "Sorteo Magno Node";
        this.precioTicket = "5.00"; // Campo nuevo
        this.descripcionSorteo = "¡Participa y gana excelentes premios en nuestra gran rifa oficial!"; // Campo nuevo
        this.nextTicketNumber = 1;
        this.maxTicketNumber = 200;
        this.responsable = { nombre: "Carlos Pérez", cedula: "12345678", telefono: "04125555555" };
        this.soldNumbers = new Set();
        this.allSoldTicketsData = [];
        this.ultimosGanadoresEncontrados = [];
        this.ultimosNumerosBuscados = [];
        this.gruposData = {
            "Grupo I":   { min: 0,   max: 199 },
            "Grupo II":  { min: 200, max: 399 },
            "Grupo III": { min: 400, max: 599 },
            "Grupo IV":  { min: 600, max: 799 },
            "Grupo V":   { min: 800, max: 999 }
        };
    }

    async loadData() {
        try {
            const data = await fs.readFile(this.dataFile, 'utf8');
            const loaded = JSON.parse(data);
            this.nombreSorteo = loaded.nombreSorteo || "Sorteo Magno Node";
            this.precioTicket = loaded.precioTicket || "5.00";
            this.descripcionSorteo = loaded.descripcionSorteo || "";
            this.nextTicketNumber = loaded.nextTicketNumber || 1;
            this.soldNumbers = new Set(loaded.soldNumbers || []);
            this.allSoldTicketsData = loaded.allSoldTicketsData || [];
            this.responsable = loaded.responsable || { nombre: "Carlos Pérez", cedula: "12345678", telefono: "04125555555" };
        } catch (error) {
            await this.saveData();
        }
    }

    async saveData() {
        const dataToSave = {
            nombreSorteo: this.nombreSorteo,
            precioTicket: this.precioTicket,
            descripcionSorteo: this.descripcionSorteo,
            nextTicketNumber: this.nextTicketNumber,
            soldNumbers: Array.from(this.soldNumbers),
            allSoldTicketsData: this.allSoldTicketsData,
            responsable: this.responsable
        };
        await fs.writeFile(this.dataFile, JSON.stringify(dataToSave, null, 4), 'utf8');
    }

    async reiniciarSorteo(nuevoNombre, precio, descripcion, respNombre, respCedula, respTelefono) {
        this.nombreSorteo = nuevoNombre;
        this.precioTicket = precio;
        this.descripcionSorteo = descripcion;
        this.responsable = { nombre: respNombre, cedula: respCedula, telefono: respTelefono };
        this.nextTicketNumber = 1;
        this.soldNumbers.clear();
        this.allSoldTicketsData = [];
        this.ultimosGanadoresEncontrados = [];
        this.ultimosNumerosBuscados = [];
        await this.saveData();
    }

    generarTicketAleatorio() {
        const ticketGenerado = [];
        for (const nombreGrupo in this.gruposData) {
            const rango = this.gruposData[nombreGrupo];
            let numeroAzar;
            do {
                numeroAzar = Math.floor(Math.random() * (rango.max - rango.min + 1)) + rango.min;
            } while (this.soldNumbers.has(numeroAzar));
            ticketGenerado.push(numeroAzar);
        }
        return ticketGenerado;
    }

    async procesarVenta(ticketNumbers, customerName, customerPhone) {
        if (this.nextTicketNumber > this.maxTicketNumber) return null;
        ticketNumbers.forEach(num => this.soldNumbers.add(num));
        const ticketId = String(this.nextTicketNumber).padStart(3, '0');
        this.nextTicketNumber++;
        const nuevoTicket = {
            sorteoName: this.nombreSorteo,
            precioTicket: this.precioTicket, // Guardamos el precio en el ticket
            descripcionSorteo: this.descripcionSorteo,
            ticketId: ticketId,
            timestamp: new Date().toLocaleString(),
            cliente: { nombre: customerName, telefono: customerPhone },
            numerosTicket: ticketNumbers.sort((a, b) => a - b),
            responsable: this.responsable
        };
        this.allSoldTicketsData.push(nuevoTicket);
        await this.saveData();
        return nuevoTicket;
    }

    buscarBoletosGanadores(numerosGanadoresArray) {
        const conjuntoGanador = new Set(numerosGanadoresArray);
        const boletosPremiados = [];
        this.ultimosNumerosBuscados = numerosGanadoresArray;
        for (const ticket of this.allSoldTicketsData) {
            const coincidencias = ticket.numerosTicket.filter(num => conjuntoGanador.has(num));
            if (coincidencias.length > 0) {
                boletosPremiados.push({
                    ticketId: ticket.ticketId,
                    cliente: ticket.cliente.nombre,
                    telefono: ticket.cliente.telefono,
                    numerosComprados: ticket.numerosTicket,
                    aciertos: coincidencias,
                    cantidadAciertos: coincidencias.length
                });
            }
        }
        this.ultimosGanadoresEncontrados = boletosPremiados.sort((a, b) => b.cantidadAciertos - a.cantidadAciertos);
        return this.ultimosGanadoresEncontrados;
    }
}

module.exports = LoteriaApp;
