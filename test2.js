const { PDFDocument, StandardFonts, TextAlignment } = require('pdf-lib');
const fs = require('fs');

async function test() {
    try {
        const payload = { 
            "EMPLOYEE NAME": "Jane Doe", 
            "employer name.0": "TechNova", 
            "REG-YTD": "41600.00" 
        };
        const templatePath = 'adp-pay-stub-template - COMPLETE2.pdf';
        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const form = pdfDoc.getForm();
        
        const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        const eName = form.getTextField('EMPLOYEE NAME');
        eName.setText(payload["EMPLOYEE NAME"]);
        try {
            eName.updateAppearances({ font: boldFont });
            console.log('updateAppearances success');
        } catch(e) { console.error('updateAppearances error:', e.message); }
        
        console.log('Success test');
    } catch (e) {
        console.error('Test failed:', e);
    }
}
test();
