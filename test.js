const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function test() {
    try {
        const payload = [{ "EMPLOYEE NAME": "Jane Doe", "PAYDATE": "04/15/2026" }];
        const finalPdf = await PDFDocument.create();
        const pdfBytes = fs.readFileSync('adp-pay-stub-template - COMPLETE2.pdf');
        
        for (const data of payload) {
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();
            for (const [key, value] of Object.entries(data)) {
                try {
                    const field = form.getTextField(key);
                    if (field && value) {
                        field.setText(String(value));
                    }
                } catch (e) {
                    console.error('Field error:', key, e);
                }
            }
            form.flatten();
            const [copiedPage] = await finalPdf.copyPages(pdfDoc, [0]);
            finalPdf.addPage(copiedPage);
        }
        
        await finalPdf.save();
        console.log('Success!');
    } catch (e) {
        console.error('Test failed:', e);
    }
}
test();
