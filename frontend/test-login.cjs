const http = require('http');

async function testLogin(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
      });
    });

    req.on('error', error => { reject(error); });
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log("Testing admin@nagarseva.gov.in:");
  console.log(await testLogin("admin@nagarseva.gov.in", "admin123"));
  console.log("\nTesting admin@vmc.gov.in:");
  console.log(await testLogin("admin@vmc.gov.in", "admin123"));
}

run();
