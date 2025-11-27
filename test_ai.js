
const https = require('https');

const API_KEY = 'AIzaSyAstQYpChUqK4T-HZQyRquAWrfX7FiEF44';
const MODEL = 'gemini-2.0-flash'; // Testing the model in the code
// const MODEL = 'gemini-1.5-flash'; // Alternative to test

async function testGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

    const data = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
    });

    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(JSON.parse(body));
                } else {
                    reject({ statusCode: res.statusCode, body: body });
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log(`Testing with model: ${MODEL}`);
    try {
        const response = await testGemini("Explain what google.com is.");
        console.log("Success!");
        console.log(JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("Error:");
        console.error(error);
    }
}

run();
