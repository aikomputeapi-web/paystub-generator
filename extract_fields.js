const { PDFDocument } = require('pdf-lib');
const fs = require('fs');

async function main() {
  const pdfBytes = fs.readFileSync('adp-pay-stub-template - COMPLETE2.pdf');
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  const fieldList = fields.map(field => field.getName());
  fs.writeFileSync('fields.json', JSON.stringify(fieldList, null, 2));
}
main();
