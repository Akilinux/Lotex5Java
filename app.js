const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const LoteriaApp = require('./loteria');
const { generarHTML } = require('./vista');
const server = express();
const PORT = 3000;

server.use(express.urlencoded({ extended: true }));
server.use(express.json());

const appLoteria = new LoteriaApp();

// =======================================================
// RUTA PÚBLICA (Comprador - WhatsApp)
// =======================================================
server.get('/', async (req, res) => {
    await appLoteria.loadData();
    res.send(generarHTML(appLoteria, false)); 
});

// =======================================================
// RUTA ADMINISTRATIVA PROTEGIDA
// =======================================================
server.get('/admin', async (req, res) => {
    await appLoteria.loadData();
    
    // Capturamos la clave que se escribe en la URL (?pass=...)
    const claveIntroducida = req.query.pass;
    
    // Si la clave es correcta, entras al panel completo
    if (claveIntroducida === appLoteria.claveAdmin) {
        res.send(generarHTML(appLoteria, true)); 
    } else {
        // Si es incorrecta o no la pusiste, te bloquea el acceso
        res.send('<h1 style="color:red; text-align:center; font-family:Arial; margin-top:50px;">🔒 Acceso Denegado</h1>' + 
                 '<p style="text-align:center; font-family:Arial; color:#666;">El enlace administrativo es inválido o requiere contraseña.</p>' +
                 '<p style="text-align:center;"><a href="/" style="color:#2196F3; font-weight:bold; text-decoration:none;">Volver al Inicio</a></p>');
    }
});

// ACCIÓN DE CONFIGURACIÓN: Guarda los datos e incluye la nueva clave
server.post('/configurar', async (req, res) => {
    const { sorteo, precio, descripcion, nombre, cedula, telefono, claveAdmin } = req.body;
    await appLoteria.reiniciarSorteo(sorteo, precio, descripcion, nombre, cedula, telefono, claveAdmin);
    
    // Te redirige automáticamente a tu panel administrativo usando tu nueva clave
    res.redirect(`/admin?pass=${claveAdmin}`); 
});

// ACCIÓN 1: Procesar la venta automática con dados
server.post('/vender-aleatorio', async (req, res) => {
    const { nombre, telefono, esAdmin } = req.body;
    const numerosAleatorios = appLoteria.generarTicketAleatorio();
    const nuevoTicket = await appLoteria.procesarVenta(numerosAleatorios, nombre, telefono);
    
    if (nuevoTicket) {
        res.redirect(`/descargar-pdf/${nuevoTicket.ticketId}?from=${esAdmin === 'true' ? 'admin' : 'root'}`);
    } else {
        res.redirect(esAdmin === 'true' ? '/admin' : '/');
    }
});

// ACCIÓN 2: Procesar la venta manual con los números elegidos por el usuario
server.post('/vender-manual', async (req, res) => {
    const { nombre, telefono, g1, g2, g3, g4, g5, esAdmin } = req.body;
    const numerosElegidos = [parseInt(g1), parseInt(g2), parseInt(g3), parseInt(g4), parseInt(g5)];
    const nuevoTicket = await appLoteria.procesarVenta(numerosElegidos, nombre, telefono);
    
    if (nuevoTicket) {
        res.redirect(`/descargar-pdf/${nuevoTicket.ticketId}?from=${esAdmin === 'true' ? 'admin' : 'root'}`);
    } else {
        res.redirect(esAdmin === 'true' ? '/admin' : '/');
    }
});

server.post('/premiar', (req, res) => {
    const { n1, n2, n3, n4, n5 } = req.body;
    const ganadores = [parseInt(n1), parseInt(n2), parseInt(n3), parseInt(n4), parseInt(n5)];
    appLoteria.buscarBoletosGanadores(ganadores);
    res.redirect('/admin'); 
});

server.post('/configurar', async (req, res) => {
    const { sorteo, precio, descripcion, nombre, cedula, telefono } = req.body;
    await appLoteria.reiniciarSorteo(sorteo, precio, descripcion, nombre, cedula, telefono);
    res.redirect('/admin'); 
});

server.get('/reporte-disponibilidad', (req, res) => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename=Reporte_Disponibilidad.pdf');
    const doc = new PDFDocument({ size: 'LETTER', margin: 30 });
    doc.pipe(res);
    doc.fontSize(16).text('REPORTE DE DISPONIBILIDAD DE NÚMEROS', { align: 'center' });
    doc.fontSize(12).text(`Sorteo: ${appLoteria.nombreSorteo}`, { align: 'center' });
    doc.fontSize(9).text(`Responsable: ${appLoteria.responsable.nombre} | Generado el: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(10).fillColor('green').text('■ Disponible ', { listType: 'bullet', continued: true });
    doc.fillColor('red').text('■ Vendido');
    doc.moveDown(1.5);
    let xStart = 40; let yStart = doc.y; let columna = 0; let fila = 0;
    for (let i = 0; i <= 999; i++) {
        const numStr = String(i).padStart(3, '0');
        const estaVendido = appLoteria.soldNumbers.has(i);
        doc.fillColor(estaVendido ? 'red' : 'green').fontSize(8);
        doc.text(numStr, xStart + (columna * 26), yStart + (fila * 12));
        columna++;
        if (columna >= 20) { columna = 0; fila++; }
        if (yStart + (fila * 12) > 730) { doc.addPage(); yStart = 40; fila = 0; columna = 0; }
    }
    doc.end();
});

server.get('/descargar-pdf/:ticketId', async (req, res) => {
    const ticket = appLoteria.allSoldTicketsData.find(t => t.ticketId === req.params.ticketId);
    if (!ticket) return res.status(404).send('No encontrado');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Boleto_${ticket.ticketId}.pdf`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 10 });
    doc.pipe(res);

    doc.rect(5, 5, 420, 200).lineWidth(1.5).stroke('#1e1e2f');
    doc.fillColor('#1e1e2f').fontSize(14).text(`Lotería: ${ticket.sorteoName}`, 15, 15, { stroke: true });
    doc.fillColor('#4CAF50').fontSize(14).text(`VALOR: $${ticket.precioTicket || '0.00'}`, 300, 15, { bold: true });
    doc.fillColor('#ff1e56').fontSize(12).text(`BOLETO #: ${ticket.ticketId}`, 15, 35, { bold: true });
    doc.fillColor('#555').fontSize(8).text(`Detalle: ${ticket.descripcionSorteo || 'Gran sorteo de la rifa.'}`, 15, 55, { width: 260, height: 25 });
    
    doc.fillColor('#000').fontSize(9);
    doc.text(`Cliente: ${ticket.cliente.nombre}`, 15, 85);
    doc.text(`Teléfono: ${ticket.cliente.telefono}`, 15, 98);
    doc.text(`Fecha de emisión: ${ticket.timestamp}`, 15, 111);
    
    doc.fillColor('#1b6ca8').fontSize(10).text('NÚMEROS PARTICIPANTES:', 15, 135, { underline: true });
    const stringNumeros = ticket.numerosTicket.map(n => String(n).padStart(3, '0')).join('   ');
    doc.fillColor('#000').fontSize(14).text(stringNumeros, 15, 150, { bold: true });

    doc.fillColor('#666').fontSize(7);
    doc.text(`Resp: ${ticket.responsable.nombre} | CI: ${ticket.responsable.cedula} | Tlf: ${ticket.responsable.telefono}`, 15, 185);

    const datosQr = JSON.stringify({ id: ticket.ticketId, numeros: ticket.numerosTicket, sorteo: ticket.sorteoName });
    const qrBuffer = await QRCode.toBuffer(datosQr, { margin: 1, width: 95 });
    doc.image(qrBuffer, 310, 55);

    doc.end();
});
// RUTA EXCLUSIVA PARA DESCARGAR EL RESPALDO JSON (Solo para ti)
server.get('/descargar-base-datos', (req, res) => {
    res.download(appLoteria.dataFile, 'respaldo_loteria.json');
});

server.listen(PORT, async () => {
    await appLoteria.loadData();
    console.log(`\n🚀 ¡Sistema de Lotería Completo y Operacional!`);
    console.log(`👉 Ingresa aquí: http://localhost:${PORT}`);
});