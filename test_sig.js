const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function testSig() {
    try {
        const pdfBytes = fs.readFileSync('adp-pay-stub-template - COMPLETE2.pdf');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        const sig = form.getSignature('Signature1');
        const widgets = sig.acroField.getWidgets();
        const rect = widgets[0].getRectangle();
        console.log('Sig rect:', rect);
    } catch(e) {
        console.error(e);
    }
}
testSig();
