document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('paystub-form');
    const mockDataBtn = document.getElementById('mock-data-btn');
    const generateBtn = document.getElementById('generate-btn');
    const spinner = generateBtn.querySelector('.spinner');
    const btnText = generateBtn.querySelector('span');

    function parseNumber(value) {
        const n = parseFloat(String(value || '').replace(/,/g, '').trim());
        return Number.isFinite(n) ? n : 0;
    }

    function formatMoney(value) {
        return parseNumber(value).toFixed(2);
    }

    function getPeriodsElapsedInYear(payDateStr) {
        const [m, d, y] = String(payDateStr || '').split('/').map((part) => parseInt(part, 10));
        if (!m || !d || !y) return 1;
        const monthIndex = Math.max(0, Math.min(11, m - 1));
        const periodInMonth = d <= 15 ? 1 : 2;
        return (monthIndex * 2) + periodInMonth;
    }

    function calculatePayPeriods(count, anchorDateStr) {
        const dates = [];
        const anchorParts = String(anchorDateStr || '').split('/').map((part) => parseInt(part, 10));
        const hasAnchor = anchorParts.length === 3 && anchorParts.every((part) => Number.isInteger(part) && part > 0);
        const today = hasAnchor ? new Date(anchorParts[2], anchorParts[0] - 1, anchorParts[1]) : new Date();

        let currentPeriod = {};
        if (today.getDate() > 15) {
            const eom = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            currentPeriod = { d: eom.getDate(), m: today.getMonth(), y: today.getFullYear() };
        } else {
            currentPeriod = { d: 15, m: today.getMonth(), y: today.getFullYear() };
        }

        for (let i = 0; i < count; i++) {
            const dateObj = new Date(currentPeriod.y, currentPeriod.m, currentPeriod.d);
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            const yyyy = dateObj.getFullYear();
            dates.push(`${mm}/${dd}/${yyyy}`);

            if (currentPeriod.d === 15) {
                const prevEOM = new Date(currentPeriod.y, currentPeriod.m, 0);
                currentPeriod = { d: prevEOM.getDate(), m: prevEOM.getMonth(), y: prevEOM.getFullYear() };
            } else {
                currentPeriod = { d: 15, m: currentPeriod.m, y: currentPeriod.y };
            }
        }
        return dates.reverse();
    }

    function calculateDerivedFields(sourceData, payDateStr) {
        const periodsElapsed = getPeriodsElapsedInYear(payDateStr);

        const regRate = parseNumber(sourceData['REG-RATE']);
        const regHours = parseNumber(sourceData['REG-HOURS']);
        const otRate = parseNumber(sourceData['OT-RATE']);
        const otHours = parseNumber(sourceData['OT-HOURS']);
        const holidayRate = parseNumber(sourceData['HOLIDAY-RATE']);
        const holidayHours = parseNumber(sourceData['HOLIDAY-HOURS']);
        const tuitionRate = parseNumber(sourceData['TUITION-RATE']);

        const regTp = regRate * regHours;
        const otTp = otRate * otHours;
        const holidayTp = holidayRate * holidayHours;
        const tuitionTp = tuitionRate;
        const grossPay = regTp + otTp + holidayTp + tuitionTp;

        const fedTp = grossPay * 0.153;
        const ssTp = grossPay * 0.062;
        const medicareTp = grossPay * 0.0145;
        const stateTp = grossPay * 0.0725;
        const localTp = grossPay * 0.008;
        const suiTp = grossPay * 0.01;

        const k401Tp = grossPay * 0.048;
        const stockTp = grossPay * 0.015;
        const lifeTp = grossPay * 0.0024;
        const bondTp = grossPay * 0.002;
        const loanTp = grossPay * 0.008;
        const groupTermLifeTp = grossPay * 0.002;

        const totalWithholding = fedTp + ssTp + medicareTp + stateTp + localTp + suiTp + k401Tp + stockTp + lifeTp + bondTp + loanTp + groupTermLifeTp;
        const netPay = grossPay - totalWithholding;

        return {
            'REG-THIS PERIOD': formatMoney(regTp),
            'REG-YTD': formatMoney(regTp * periodsElapsed),
            'OT-THISPERIOD': formatMoney(otTp),
            'OT-YTD': formatMoney(otTp * periodsElapsed),
            'HOLIDAY-THISPERIOD': formatMoney(holidayTp),
            'HOLIDAY-YTD': formatMoney(holidayTp * periodsElapsed),
            'TUITION-THISPERIOD': formatMoney(tuitionTp),
            'TUITION-YTD': formatMoney(tuitionTp * periodsElapsed),
            'GROSS PAY': formatMoney(grossPay),
            'FED INCOME TAX-TP': formatMoney(fedTp),
            'FED INCOME TAX-YTD': formatMoney(fedTp * periodsElapsed),
            'SOCIAL SEC TAX-TP': formatMoney(ssTp),
            'SOCIAL SEC TAX-YTD': formatMoney(ssTp * periodsElapsed),
            'MEDICARE TAX-TP': formatMoney(medicareTp),
            'MEDICARE TAX-YTD': formatMoney(medicareTp * periodsElapsed),
            'STATE INCOME TAX-TP': formatMoney(stateTp),
            'STATE INCOME TAX-YTD': formatMoney(stateTp * periodsElapsed),
            'LOCAL TAX-TP': formatMoney(localTp),
            'LOCAL TAX-YTD': formatMoney(localTp * periodsElapsed),
            'SUI/SDI TAX-TP': formatMoney(suiTp),
            'SUI/SDI TAX-YTD': formatMoney(suiTp * periodsElapsed),
            '401K-TP': formatMoney(k401Tp),
            '401K-YTD': formatMoney(k401Tp * periodsElapsed),
            'STOCK-TP': formatMoney(stockTp),
            'STOCK-YTD': formatMoney(stockTp * periodsElapsed),
            'LIFE-TP': formatMoney(lifeTp),
            'LIFE-YTD': formatMoney(lifeTp * periodsElapsed),
            'BOND-TP': formatMoney(bondTp),
            'BOND-YTD': formatMoney(bondTp * periodsElapsed),
            'LOAN-TP': formatMoney(loanTp),
            'LOAN-YTD': formatMoney(loanTp * periodsElapsed),
            'LOAN AMOUNT PAID-YTD': formatMoney(loanTp * periodsElapsed),
            'GROUP TERM LIFE-TP': formatMoney(groupTermLifeTp),
            'GROUP TERM LIFE-YTD': formatMoney(groupTermLifeTp * periodsElapsed),
            'VACHOURS': formatMoney(periodsElapsed * 5),
            'SICK-HOURS': formatMoney(periodsElapsed * 2),
            'NETPAY': formatMoney(netPay),
            'AMOUNT': formatMoney(netPay)
        };
    }

    const paydateInput = document.getElementById('PAYDATE');
    if (paydateInput) {
        const mostRecent = calculatePayPeriods(1)[0];
        paydateInput.value = mostRecent;
    }

    const autoCalcTriggers = [
        'REG-RATE', 'REG-HOURS',
        'OT-RATE', 'OT-HOURS',
        'HOLIDAY-RATE', 'HOLIDAY-HOURS',
        'TUITION-RATE',
        'PAYDATE',
        'EMPLOYEE NAME'
    ];

    function applyAutoCalculationsToForm() {
        const formData = new FormData(form);
        const sourceData = {};
        for (const [key, value] of formData.entries()) {
            if (key !== 'num_stubs') {
                sourceData[key] = value;
            }
        }

        const payDate = sourceData['PAYDATE'] || (paydateInput ? paydateInput.value : '');
        const calculated = calculateDerivedFields(sourceData, payDate);
        calculated.PAYTO = sourceData['EMPLOYEE NAME'] || sourceData.PAYTO || '';

        for (const [key, value] of Object.entries(calculated)) {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) input.value = value;
        }
    }

    mockDataBtn.addEventListener('click', () => {
        const mockData = {
            'employer name.0': 'TechNova Solutions Inc.',
            'employer addr 1': '101 Innovation Blvd',
            'employer addr2': 'Suite 400, San Francisco, CA 94105',
            'EMPLOYEE NAME': 'Jane Doe',
            'EMPLOYEE ADDR1': '789 Sunset Avenue',
            'EMPLOYEE ADDR2': 'Apt 12, Oakland, CA 94612',
            'SSN': '***-**-1234',
            'TITLE': 'Lead Developer',
            'CHECK NUM': '40921',
            // Earnings
            'REG-RATE': '65.00', 'REG-HOURS': '80.00', 'REG-THIS PERIOD': '5200.00', 'REG-YTD': '41600.00',
            'OT-RATE': '97.50', 'OT-HOURS': '5.00', 'OT-THISPERIOD': '487.50', 'OT-YTD': '1950.00',
            'HOLIDAY-RATE': '65.00', 'HOLIDAY-HOURS': '8.00', 'HOLIDAY-THISPERIOD': '520.00', 'HOLIDAY-YTD': '1040.00',
            // Missing hours just uses blank space
            'GROSS PAY': '6207.50',
            'NETPAY': '4150.25',
            // Taxes
            'FED INCOME TAX-TP': '950.00', 'FED INCOME TAX-YTD': '7600.00',
            'SOCIAL SEC TAX-TP': '384.86', 'SOCIAL SEC TAX-YTD': '3078.88',
            'MEDICARE TAX-TP': '90.00', 'MEDICARE TAX-YTD': '720.00',
            'STATE INCOME TAX-TP': '450.00', 'STATE INCOME TAX-YTD': '3600.00',
            'LOCAL TAX-TP': '50.00', 'LOCAL TAX-YTD': '400.00',
            'SUI/SDI TAX-TP': '62.00', 'SUI/SDI TAX-YTD': '496.00',
            // Deductions & Other
            '401K-TP': '300.00', '401K-YTD': '2400.00',
            'LIFE-TP': '15.00', 'LIFE-YTD': '120.00',
            'GROUP TERM LIFE-TP': '12.50', 'GROUP TERM LIFE-YTD': '100.00',
            'LOAN-TP': '50.00', 'LOAN-YTD': '400.00',
            'LOAN AMOUNT PAID-YTD': '400.00',
            'VACHOURS': '120.00', 'SICK-HOURS': '48.00',
            'PAYTO': 'Jane Doe',
            'AMOUNT': '4150.25'
        };

        for (const [key, value] of Object.entries(mockData)) {
            const input = document.querySelector(`[name="${key}"]`);
            if (input) {
                input.value = value;
            }
        }

        applyAutoCalculationsToForm();
    });

    autoCalcTriggers.forEach((name) => {
        const input = document.querySelector(`[name="${name}"]`);
        if (input) {
            input.addEventListener('input', applyAutoCalculationsToForm);
            input.addEventListener('change', applyAutoCalculationsToForm);
        }
    });

    applyAutoCalculationsToForm();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Show loading state
        btnText.style.opacity = '0.7';
        spinner.classList.remove('disabled');
        generateBtn.disabled = true;

        const formData = new FormData(form);
        const baseData = {};
        for (let [key, value] of formData.entries()) {
            if (key !== 'num_stubs') {
                baseData[key] = value;
            }
        }
        
        const numStubs = parseInt(formData.get('num_stubs') || '1', 10);
        const payDates = calculatePayPeriods(numStubs, baseData['PAYDATE']);

        const requestData = payDates.map((dateStr, index) => {
            const payload = {
                ...baseData,
                'PAYDATE': dateStr,
                'CHECK NUM': baseData['CHECK NUM'] ? String(parseInt(baseData['CHECK NUM']) + index) : ''
            };
            const calculated = calculateDerivedFields(payload, dateStr);
            return {
                ...payload,
                ...calculated,
                PAYTO: payload['EMPLOYEE NAME'] || payload.PAYTO || ''
            };
        });

        try {
            const response = await fetch('/api/generate-paystub', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error('Failed to generate PDF');
            }

            // Create a blob from the PDF stream
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            // Create a temporary link to trigger download
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `Paystub_${baseData['EMPLOYEE NAME'] || 'Employee'}_${payDates[payDates.length-1].replace(/\//g, '-')}.pdf`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (error) {
            console.error('Error:', error);
            alert('There was an error generating the paystub. Please try again.');
        } finally {
            // Restore button state
            btnText.style.opacity = '1';
            spinner.classList.add('disabled');
            generateBtn.disabled = false;
        }
    });
});
