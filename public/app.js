document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('paystub-form');
    const mockDataBtn = document.getElementById('mock-data-btn');
    const generateBtn = document.getElementById('generate-btn');
    const spinner = generateBtn.querySelector('.spinner');
    const btnText = generateBtn.querySelector('span');

    function calculatePayPeriods(count) {
        const dates = [];
        const today = new Date();
        let currentPeriod = {};
        if (today.getDate() > 15) {
            currentPeriod = { d: 15, m: today.getMonth(), y: today.getFullYear() };
        } else {
            const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
            currentPeriod = { d: prevMonth.getDate(), m: prevMonth.getMonth(), y: prevMonth.getFullYear() };
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

    const paydateInput = document.getElementById('PAYDATE');
    if (paydateInput) {
        // Set most recent as placeholder/value
        const mostRecent = calculatePayPeriods(1)[0];
        paydateInput.value = mostRecent;
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
    });

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
        const payDates = calculatePayPeriods(numStubs);
        
        const requestData = payDates.map((dateStr, index) => {
            return {
                ...baseData,
                'PAYDATE': dateStr,
                'CHECK NUM': baseData['CHECK NUM'] ? String(parseInt(baseData['CHECK NUM']) + index) : ''
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
