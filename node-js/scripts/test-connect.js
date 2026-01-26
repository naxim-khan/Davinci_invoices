
const http = require('http');

const testUrl = (hostname, port) => {
    return new Promise((resolve) => {
        const req = http.get({
            hostname,
            port,
            path: '/',
            timeout: 2000
        }, (res) => {
            console.log(`SUCCESS: Connected to ${hostname}:${port} - Status: ${res.statusCode}`);
            resolve(true);
        });

        req.on('error', (e) => {
            console.log(`FAILURE: Could not connect to ${hostname}:${port} - Error: ${e.message}`);
            resolve(false);
        });

        req.end();
    });
};

async function check() {
    console.log('Testing connectivity...');
    await testUrl('localhost', 5173);
    await testUrl('127.0.0.1', 5173);
}

check();
