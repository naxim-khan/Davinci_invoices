import fs from 'fs';
import path from 'path';
import axios from 'axios';

async function verifyPdf() {
    try {
        const invoiceId = 23; // Using the ID from your frontend Example
        const url = `http://localhost:3000/api/invoices/${invoiceId}/pdf`;

        console.log(`Fetching PDF from ${url}...`);

        const response = await axios.get(url, {
            responseType: 'arraybuffer'
        });

        const outputPath = path.join(process.cwd(), `invoice-${invoiceId}-test.pdf`);
        fs.writeFileSync(outputPath, response.data);

        console.log(`Success! PDF saved to ${outputPath}`);
        console.log(`Size: ${response.data.length} bytes`);

    } catch (error: any) {
        console.error('Verification failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data.toString());
        }
    }
}

verifyPdf();
