function generarHTML(appLoteria, esAdmin = false) {
    const listaHtmlTickets = appLoteria.allSoldTicketsData.map(t => 
        `<li>
            <b>Ticket #${t.ticketId}</b> - ${t.cliente.nombre} (${t.cliente.telefono})<br>
            💰 Valor: $${t.precioTicket || '0.00'}<br>
            Números: ${t.numerosTicket.map(n => String(n).padStart(3, '0')).join(' | ')} <br>
            <a href="/descargar-pdf/${t.ticketId}" style="color: #4CAF50; font-size: 13px; font-weight: bold; text-decoration: none;">📥 Descargar PDF</a>
         </li>`
    ).reverse().join('');

    let htmlGanadores = "";
    if (appLoteria.ultimosNumerosBuscados.length > 0) {
        htmlGanadores += `<p style="background:#e3f2fd;color:#0d47a1;padding:10px;border-radius:4px;font-weight:bold;text-align:center;">Resultados oficiales: ${appLoteria.ultimosNumerosBuscados.map(n => String(n).padStart(3, '0')).join(', ')}</p>`;
        if (appLoteria.ultimosGanadoresEncontrados.length === 0) {
            htmlGanadores += `<li>❌ No hubo boletos premiados en esta ronda.</li>`;
        } else {
            htmlGanadores += appLoteria.ultimosGanadoresEncontrados.map(g => `
                <li style="border-left: 5px solid #ff9800; background: #fffbe6;">
                    🎯 <b>¡Boleto Premiado #${g.ticketId}!</b><br>
                    👤 Cliente: ${g.cliente}<br>
                    ⭐ <b>Aciertos: <span style="color:red">${g.aciertos.map(n => String(n).padStart(3, '0')).join(', ')}</span></b> (${g.cantidadAciertos} aciertos)
                </li>
            `).join('');
        }
    } else {
        htmlGanadores = "<li>Escribe los números ganadores para escanear.</li>";
    }

    const generarOpcionesGrupo = (min, max) => {
        let opciones = "";
        for (let i = min; i <= max; i++) {
            if (!appLoteria.soldNumbers.has(i)) {
                opciones += `<option value="${i}">${String(i).padStart(3, '0')}</option>`;
            }
        }
        return opciones || `<option disabled>No hay números libres</option>`;
    };

    const opcionesG1 = generarOpcionesGrupo(0, 199);
    const opcionesG2 = generarOpcionesGrupo(200, 399);
    const opcionesG3 = generarOpcionesGrupo(400, 599);
    const opcionesG4 = generarOpcionesGrupo(600, 799);
    const opcionesG5 = generarOpcionesGrupo(800, 999);

    // --- BLOQUES CONDICIONALES SEPARADOS ---
    let bloqueConfiguracion = '<p style="color: #666; margin: 0;">📌 Adquiere tus números seleccionándolos directamente abajo.</p>';
    let bloqueReportesyPremios = '';
    let bloqueHistorialyResultados = '';

    if (esAdmin) {
        bloqueConfiguracion = `
        <form action="/configurar" method="POST">
	    <input type="password" name="claveAdmin" placeholder="Definir Clave Administrador" required>
            <input type="text" name="sorteo" placeholder="Nombre del Sorteo" required>
            <input type="text" name="precio" placeholder="Precio del ticket (Ej: 5.00)" required>
            <input type="text" name="nombre" placeholder="Nombre Responsable" required>
            <input type="text" name="cedula" placeholder="Cédula" required>
            <input type="text" name="telefono" placeholder="Teléfono" required>
            <textarea name="descripcion" placeholder="Descripción de la rifa / Premios (2-3 líneas)" required></textarea>
            <button type="submit" class="btn btn-danger" style="margin:0; width:100%; grid-column: span 4;" onclick="return confirm('¿Seguro que deseas iniciar un sorteo nuevo?')">🔄 Iniciar Sorteo Nuevo</button>
        </form>`;

        bloqueReportesyPremios = `
        <h2 style="margin-top:25px;">📊 Reportes y Respaldos</h2>
        <a href="/reporte-disponibilidad" target="_blank"><button class="btn btn-success">📄 Descargar Reporte Disponibilidad (PDF)</button></a>
        <!-- NUEVO BOTÓN DE RESPALDO DE BASE DE DATOS -->
        <a href="/descargar-base-datos"><button class="btn" style="background: #795548; margin-top:5px;">📥 Descargar Respaldo de Datos (JSON)</button></a>

        <h2 style="margin-top:25px;">🏆 Realizar Premiación</h2>
        <form action="/premiar" method="POST">
            <div class="inputs-premios">
                <input type="number" name="n1" required> <input type="number" name="n2" required>
                <input type="number" name="n3" required> <input type="number" name="n4" required>
                <input type="number" name="n5" required>
            </div>
            <button type="submit" class="btn btn-warn">🔎 Escanear Ganadores</button>
        </form>`;

        bloqueHistorialyResultados = `
        <div class="panel"><h2>📊 Historial (${appLoteria.allSoldTicketsData.length})</h2><ul>${listaHtmlTickets || '<li>No hay ventas.</li>'}</ul></div>
        <div class="panel" style="background:#fbfbfb;"><h2>🥇 Resultados</h2><ul>${htmlGanadores}</ul></div>`;
    }

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Sistema de Ventas - Node Lotería</title>
        <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f9; margin: 0; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
            .container { display: flex; gap: 20px; align-items: flex-start; }
            .panel { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); flex: 1; }
            .btn { background: #2196F3; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; width: 100%; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .btn:hover { background: #0b7dda; }
            .btn-select { background: #673AB7; }
            .btn-select:hover { background: #512DA8; }
            .btn-warn { background: #ff9800; }
            .btn-danger { background: #f44336; }
            .btn-success { background: #4CAF50; }
            .input-group { margin-bottom: 12px; }
            .input-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .input-group input, .input-group textarea, .input-group select { width: 95%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; font-family: Arial, sans-serif; font-size: 14px; }
            .inputs-premios, .selects-quintula { display: flex; gap: 8px; margin-bottom: 15px; }
            .inputs-premios input { width: 100%; padding: 8px; text-align: center; font-size: 16px; font-weight: bold; border: 1px solid #ccc; border-radius: 4px; }
            .selects-quintula select { width: 100%; padding: 8px; font-weight: bold; text-align: center; }
            ul { padding: 0; max-height: 520px; overflow-y: auto; }
            li { margin-bottom: 12px; background: #eee; padding: 12px; border-radius: 4px; list-style: none; line-height: 1.5; }
            .config-box { background: #1e1e2f; color: white; padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 15px; }
            .config-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px; }
            .config-box form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 6px; }
            .config-box input, .config-box textarea { padding: 8px; border-radius: 4px; border: none; font-size: 14px; }
            .config-box textarea { grid-column: span 3; height: 35px; resize: none; }
        </style>
    </head>
    <body>
        <div class="config-box">
            <div class="config-header">
                <div>
                    <h1 style="margin:0; font-size:26px;">Lotería: ${appLoteria.nombreSorteo} (Valor: $${appLoteria.precioTicket})</h1>
                    <p style="margin: 5px 0 0 0; color: #aaa; font-style: italic;">"${appLoteria.descripcionSorteo || 'Gran sorteo familiar.'}"</p>
                    <small style="display:block; margin-top:5px; color:#4CAF50">Responsable: ${appLoteria.responsable.nombre} (CI: ${appLoteria.responsable.cedula})</small>
                </div>
            </div>
            ${bloqueConfiguracion}
        </div>

        <div class="container">
            <div class="panel">
                <h2>🛒 Venta Aleatoria (Automática)</h2>
                <p>Próximo boleto: <b>#${String(appLoteria.nextTicketNumber).padStart(3, '0')}</b></p>
                <form action="/vender-aleatorio" method="POST">
                    <input type="hidden" name="esAdmin" value="${esAdmin}">
                    <div class="input-group"><label>Nombre del Cliente:</label><input type="text" name="nombre" required></div>
                    <div class="input-group"><label>Teléfono / WhatsApp:</label><input type="text" name="telefono" required></div>
                    <button type="submit" class="btn">🎲 Generar Números y Vender</button>
                </form>

                <h2 style="margin-top:25px;">✏️ Venta Manual (Selección de Números)</h2>
                <form action="/vender-manual" method="POST">
                    <input type="hidden" name="esAdmin" value="${esAdmin}">
                    <div class="input-group"><label>Nombre del Cliente:</label><input type="text" name="nombre" required></div>
                    <div class="input-group"><label>Teléfono / WhatsApp:</label><input type="text" name="telefono" required></div>
                    
                    <label style="display:block; margin-bottom:5px; font-weight:bold;">Seleccione un número libre por grupo:</label>
                    <div class="selects-quintula">
                        <select name="g1" required>${opcionesG1}</select>
                        <select name="g2" required>${opcionesG2}</select>
                        <select name="g3" required>${opcionesG3}</select>
                        <select name="g4" required>${opcionesG4}</select>
                        <select name="g5" required>${opcionesG5}</select>
                    </div>
                    <button type="submit" class="btn btn-select">🛍️ Validar Selección y Vender</button>
                </form>
                ${bloqueReportesyPremios}
            </div>
            ${bloqueHistorialyResultados}
        </div>
    </body>
    </html>`;
}
module.exports = { generarHTML };

