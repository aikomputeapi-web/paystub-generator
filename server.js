const express = require('express');
const cors = require('cors');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.post('/api/generate-paystub', async (req, res) => {
    try {
        const reqData = req.body;
        const payloads = Array.isArray(reqData) ? reqData : [reqData];
        
        const { TextAlignment, StandardFonts } = require('pdf-lib');
        const finalPdf = await PDFDocument.create();
        const templatePath = path.join(__dirname, 'adp-pay-stub-template - COMPLETE2.pdf');
        const pdfBytes = fs.readFileSync(templatePath);
        
        for (const data of payloads) {
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const form = pdfDoc.getForm();
            
            const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
            const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
            
            for (const [key, value] of Object.entries(data)) {
                try {
                    const field = form.getTextField(key);
                    if (field && value) {
                        let finalValue = String(value);
                        
                        // Handle AMOUNT check conversion to words
                        if (key === 'AMOUNT') {
                            const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
                            const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
                            const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
                            function convertLessThanOneThousand(n) {
                                if (n === 0) return '';
                                let res = '';
                                if (n >= 100) { res += ones[Math.floor(n / 100)] + ' HUNDRED '; n %= 100; }
                                if (n >= 10 && n <= 19) { res += teens[n - 10] + ' '; } 
                                else if (n >= 20 || n > 0) {
                                    if (n >= 20) { res += tens[Math.floor(n / 10)] + ' '; n %= 10; }
                                    if (n > 0) { res += ones[n] + ' '; }
                                }
                                return res;
                            }
                            
                            let num = parseFloat(finalValue.replace(/,/g, ''));
                            if (!isNaN(num)) {
                                const dollars = Math.floor(num);
                                const cents = Math.round((num - dollars) * 100);
                                const centStr = String(cents).padStart(2, '0') + '/100';
                                let res = '';
                                
                                let dCount = dollars;
                                if (dCount >= 1000000) {
                                    res += convertLessThanOneThousand(Math.floor(dCount / 1000000)) + 'MILLION ';
                                    dCount %= 1000000;
                                }
                                if (dCount >= 1000) {
                                    res += convertLessThanOneThousand(Math.floor(dCount / 1000)) + 'THOUSAND ';
                                    dCount %= 1000;
                                }
                                if (dCount > 0) {
                                    res += convertLessThanOneThousand(dCount);
                                }
                                
                                if (res.trim() === '') res = 'ZERO ';
                                finalValue = '***' + res.trim() + ' AND ' + centStr + ' DOLLARS***';
                                
                                // Set the new numeric check amount field
                                try {
                                    const checkAmountField = form.getTextField('check amount');
                                    if (checkAmountField) checkAmountField.setText(String(value));
                                } catch (e) {
                                    // Ignore if not precisely named
                                }
                            }
                        }
                        
                        // Handle PAYDATE duplicates
                        if (key === 'PAYDATE') {
                            try {
                                const periodEndingField = form.getTextField('period ending');
                                if (periodEndingField) periodEndingField.setText(String(value));
                            } catch(e) {}
                            
                            try {
                                const payDateField = form.getTextField('pay date');
                                if (payDateField) payDateField.setText(String(value));
                            } catch(e) {}
                        }
                        
                        // Handle alignment
                        if (key.includes('-YTD') || key.includes('-TP') || key === 'GROSS PAY' || key === 'NETPAY' || key.includes('-HOURS') || key.includes('-RATE') || key.includes('-THIS PERIOD') || key.includes('-THISPERIOD')) {
                            if (typeof field.setAlignment === 'function') {
                                field.setAlignment(TextAlignment.Right);
                            }
                        }
                        
                        // Handle fonts and all-caps
                        if (key.startsWith('EMPLOYEE NAME') || key.startsWith('EMPLOYEE ADDR')) {
                            field.setText(finalValue.toUpperCase());
                            field.updateAppearances({ font: boldFont });
                        } else if (key.startsWith('employer name') || key.startsWith('employer addr')) {
                            field.setText(finalValue.toUpperCase());
                            field.updateAppearances({ font: italicFont });
                        } else {
                            field.setText(finalValue);
                        }
                    }
                } catch (err) {
                    if (err.message && err.message.includes('PDFFont')) {
                        // Suppress updateAppearances auto-size NaN error for simplicity if it fails
                    } else {
                        console.warn(`Could not set field: ${key}`);
                    }
                }
            }
            
            // Handle Signature Injection
            try {
                const sig = form.getSignature('Signature1');
                if (sig && sig.acroField) {
                    const widgets = sig.acroField.getWidgets();
                    if (widgets && widgets.length > 0) {
                        const rect = widgets[0].getRectangle();
                        const sigPngPath = path.join(__dirname, 'signature.png');
                        const sigJpgPath = path.join(__dirname, 'signature.jpg');
                        let embeddedImage = null;
                        
                        if (fs.existsSync(sigPngPath)) {
                            embeddedImage = await pdfDoc.embedPng(fs.readFileSync(sigPngPath));
                        } else if (fs.existsSync(sigJpgPath)) {
                            embeddedImage = await pdfDoc.embedJpg(fs.readFileSync(sigJpgPath));
                        }
                        
                        const page = pdfDoc.getPages()[0];
                        
                        if (embeddedImage) {
                            const imgDims = embeddedImage.scale(1);
                            const scale = Math.min(rect.width / imgDims.width, rect.height / imgDims.height);
                            const finalWidth = imgDims.width * scale;
                            const finalHeight = imgDims.height * scale;
                            const drawX = rect.x + (rect.width - finalWidth) / 2;
                            // Push the image down substantially to compensate for built-in visual padding.
                            const drawY = rect.y - 15;
                            
                            page.drawImage(embeddedImage, {
                                x: drawX,
                                y: drawY,
                                width: finalWidth,
                                height: finalHeight,
                                opacity: 0.8
                            });
                        } else {
                            // Fallback italic Text signature
                            const sigFont = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
                            page.drawText('Robert Johnson', {
                                x: rect.x + 20,
                                y: rect.y + 2,
                                size: 14,
                                font: sigFont,
                            });
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not inject signature auto', e.message);
            }
            
            form.flatten();
            const [copiedPage] = await finalPdf.copyPages(pdfDoc, [0]);
            finalPdf.addPage(copiedPage);
        }
        
        const modifiedPdfBytes = await finalPdf.save();
        
        // Send back the modified PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="paystub.pdf"');
        res.send(Buffer.from(modifiedPdfBytes));
        
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Vercel Serverless Export configuration
if (process.env.NODE_ENV !== 'production' && require.main === module) {
    app.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });
}
module.exports = app;
