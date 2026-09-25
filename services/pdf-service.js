// Servicio de PDF oficial reutilizable (motor por código, sin navegador).
// Base para documentos oficiales del sistema: informes gerenciales, y a futuro
// cotizaciones, fichas técnicas, productos y órdenes. Construido sobre pdfkit.
//
// Uso típico:
//   const pdf = require('./services/pdf-service');
//   const doc = pdf.nuevoDocumento();
//   pdf.encabezadoOficial(doc, { empresa: 'PrintLab', titulo: 'Informe', subtitulo: '...' });
//   pdf.tituloSeccion(doc, 'Indicadores');
//   pdf.tabla(doc, columnas, filas);
//   const buffer = await pdf.aBuffer(doc);

const PDFDocument = require('pdfkit');

const COLOR_PRIMARIO = '#0b81b8';
const COLOR_TEXTO = '#1f2b36';
const COLOR_TENUE = '#60707f';
const COLOR_LINEA = '#cfd8df';
const COLOR_FILA_PAR = '#f4f7f9';

const MARGEN = 48;

function nuevoDocumento(opciones = {}) {
    const doc = new PDFDocument({
        size: opciones.tamano || 'LETTER',
        margins: { top: MARGEN, bottom: MARGEN, left: MARGEN, right: MARGEN },
        bufferPages: true,
        info: {
            Title: opciones.titulo || 'Documento PrintLab',
            Author: opciones.empresa || 'PrintLab'
        }
    });
    doc._pieTexto = opciones.pie || '';
    return doc;
}

function anchoUtil(doc) {
    return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function extraerImagenDataUri(dataUri) {
    if (typeof dataUri !== 'string') return null;
    const m = dataUri.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (!m) return null;
    try {
        return Buffer.from(m[2], 'base64');
    } catch (error) {
        return null;
    }
}

function encabezadoOficial(doc, { empresa = 'PrintLab', logoDataUri = '', titulo = '', subtitulo = '' } = {}) {
    const izquierda = doc.page.margins.left;
    const arriba = doc.page.margins.top;
    const ancho = anchoUtil(doc);
    const logoBuffer = extraerImagenDataUri(logoDataUri);
    let textoX = izquierda;

    if (logoBuffer) {
        try {
            doc.image(logoBuffer, izquierda, arriba, { fit: [120, 42] });
            textoX = izquierda + 136;
        } catch (error) {
            textoX = izquierda;
        }
    }

    doc.font('Helvetica-Bold').fontSize(15).fillColor(COLOR_TEXTO)
        .text(empresa || 'PrintLab', textoX, arriba + 2, { width: ancho - (textoX - izquierda) });
    doc.font('Helvetica').fontSize(9).fillColor(COLOR_TENUE)
        .text('Documento generado por el sistema · ' + new Date().toLocaleString('es-CR'), textoX, doc.y + 1, {
            width: ancho - (textoX - izquierda)
        });

    doc.moveDown(1.1);
    const yLinea = Math.max(doc.y, arriba + 48);
    doc.moveTo(izquierda, yLinea).lineTo(izquierda + ancho, yLinea).lineWidth(2).strokeColor(COLOR_PRIMARIO).stroke();
    doc.y = yLinea + 12;

    if (titulo) {
        doc.font('Helvetica-Bold').fontSize(18).fillColor(COLOR_TEXTO).text(titulo, izquierda, doc.y, { width: ancho });
    }
    if (subtitulo) {
        doc.font('Helvetica').fontSize(10).fillColor(COLOR_TENUE).text(subtitulo, izquierda, doc.y + 2, { width: ancho });
    }
    doc.moveDown(1);
    doc.fillColor(COLOR_TEXTO);
}

function tituloSeccion(doc, texto) {
    asegurarEspacio(doc, 40);
    doc.moveDown(0.6);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLOR_PRIMARIO)
        .text(String(texto || ''), doc.page.margins.left, doc.y, { width: anchoUtil(doc) });
    doc.moveDown(0.35);
    doc.fillColor(COLOR_TEXTO);
}

function parrafo(doc, texto, opciones = {}) {
    doc.font('Helvetica').fontSize(opciones.tamano || 10).fillColor(opciones.color || COLOR_TEXTO)
        .text(String(texto == null ? '' : texto), doc.page.margins.left, doc.y, {
            width: anchoUtil(doc),
            align: opciones.alinear || 'left'
        });
    doc.moveDown(opciones.separacion == null ? 0.4 : opciones.separacion);
    doc.fillColor(COLOR_TEXTO);
}

function asegurarEspacio(doc, alto) {
    const limite = doc.page.height - doc.page.margins.bottom;
    if (doc.y + alto > limite) {
        doc.addPage();
    }
}

// columnas: [{ clave, titulo, ancho (fracción 0-1 o px), alinear }]
// filas: array de objetos con las claves indicadas, o array de arrays.
function tabla(doc, columnas, filas, opciones = {}) {
    const izquierda = doc.page.margins.left;
    const anchoTotal = anchoUtil(doc);
    const cols = columnas.map((c) => ({ ...c }));
    const sumaFracciones = cols.reduce((acc, c) => acc + (c.ancho && c.ancho <= 1 ? c.ancho : 0), 0) || 1;
    cols.forEach((c) => {
        if (!c.ancho) c.px = anchoTotal / cols.length;
        else if (c.ancho <= 1) c.px = (c.ancho / sumaFracciones) * anchoTotal;
        else c.px = c.ancho;
    });

    const padX = 6;
    const alturaFila = opciones.alturaFila || 18;

    const dibujarCabecera = () => {
        const y = doc.y;
        doc.rect(izquierda, y, anchoTotal, alturaFila).fillColor(COLOR_PRIMARIO).fill();
        let x = izquierda;
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
        cols.forEach((c) => {
            doc.text(String(c.titulo || ''), x + padX, y + 5, { width: c.px - padX * 2, align: c.alinear || 'left', lineBreak: false });
            x += c.px;
        });
        doc.y = y + alturaFila;
        doc.fillColor(COLOR_TEXTO);
    };

    asegurarEspacio(doc, alturaFila * 2);
    dibujarCabecera();

    filas.forEach((fila, indice) => {
        asegurarEspacio(doc, alturaFila);
        if (doc.y === doc.page.margins.top) dibujarCabecera();
        const y = doc.y;
        if (indice % 2 === 1) {
            doc.rect(izquierda, y, anchoTotal, alturaFila).fillColor(COLOR_FILA_PAR).fill();
        }
        let x = izquierda;
        doc.font('Helvetica').fontSize(8.5).fillColor(COLOR_TEXTO);
        cols.forEach((c) => {
            const valor = Array.isArray(fila) ? fila[cols.indexOf(c)] : fila[c.clave];
            doc.text(valor == null ? '' : String(valor), x + padX, y + 5, {
                width: c.px - padX * 2,
                align: c.alinear || 'left',
                lineBreak: false
            });
            x += c.px;
        });
        doc.y = y + alturaFila;
    });

    doc.moveTo(izquierda, doc.y).lineTo(izquierda + anchoTotal, doc.y).lineWidth(0.5).strokeColor(COLOR_LINEA).stroke();
    doc.moveDown(0.6);
    doc.fillColor(COLOR_TEXTO);
}

function pintarPies(doc) {
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i++) {
        doc.switchToPage(i);
        const y = doc.page.height - doc.page.margins.bottom + 14;
        doc.font('Helvetica').fontSize(8).fillColor(COLOR_TENUE);
        const etiqueta = (doc._pieTexto ? doc._pieTexto + '  ·  ' : '') + 'Página ' + (i + 1 - rango.start) + ' de ' + rango.count;
        doc.text(etiqueta, doc.page.margins.left, y, { width: anchoUtil(doc), align: 'center', lineBreak: false });
    }
}

function aBuffer(doc) {
    return new Promise((resolve, reject) => {
        const trozos = [];
        doc.on('data', (t) => trozos.push(t));
        doc.on('end', () => resolve(Buffer.concat(trozos)));
        doc.on('error', reject);
        try {
            pintarPies(doc);
        } catch (error) {
            // Si falla el pie, se entrega el documento igual.
        }
        doc.end();
    });
}

module.exports = {
    nuevoDocumento,
    encabezadoOficial,
    tituloSeccion,
    parrafo,
    tabla,
    aBuffer,
    COLOR_PRIMARIO,
    COLOR_TEXTO,
    COLOR_TENUE
};
