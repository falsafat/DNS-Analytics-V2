
const https = require('https');

const API_KEY = 'AIzaSyAstQYpChUqK4T-HZQyRquAWrfX7FiEF44';
const MODEL = 'gemini-2.0-flash';

async function callGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
    const data = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const json = JSON.parse(body);
                        resolve(json.candidates[0].content.parts[0].text);
                    } catch (e) {
                        reject("Failed to parse response: " + body);
                    }
                } else {
                    reject(`Error ${res.statusCode}: ${body}`);
                }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function testExplainDomain() {
    console.log("\n--- Testing Explain Domain ---");
    const domain = "example.com";
    const prompt = `Explain what the website "${domain}" is. Is it safe for children? 
    If it is risky, explain why briefly.
    Format your answer in simple HTML (no markdown code blocks).`;
    try {
        const res = await callGemini(prompt);
        console.log("Raw Output:\n", res);
    } catch (e) { console.error(e); }
}

async function testVerifyRisks() {
    console.log("\n--- Testing Verify Risks ---");
    const domainList = "google.com, pornhub.com, wikipedia.org";
    const prompt = `Analyze the following domains for child safety risks.
        Domains: ${domainList}

        For EACH domain, rate the risk (1-5) and provide a very brief reason (max 10 words).
        Criteria:
        1: Safe/Clean
        2: Suspicious (Ambiguous terms, verify required)
        3: Slang & Suggestive (Hidden meanings, anatomy)
        4: Mature & Gambling (Dating, drugs, gambling, explicit acts)
        5: Explicit Adult (Known porn, severe content)

        Return a JSON ARRAY only. No markdown.
        Format: [{"domain": "example.com", "level": 1, "reason": "Safe tech site"}, ...]`;
    try {
        const res = await callGemini(prompt);
        console.log("Raw Output:\n", res);
    } catch (e) { console.error(e); }
}

async function testActivityReport() {
    console.log("\n--- Testing Activity Report ---");
    const prompt = `You are a helpful AI assistant for a parental control dashboard.
    Analyze this DNS traffic summary:
    - Total Queries: 1500
    - Blocked Queries: 25
    - Top Domains: google.com, youtube.com, facebook.com
    - Risk Distribution: Safe: 1400, Suspicious: 50, Explicit: 5
    - Peak Activity Hour: 20:00

    Generate a concise behavioral report (max 3-4 sentences) for the parent. 
    Highlight any concerning habits or confirm if usage looks normal.
    Use a friendly but professional tone.
    Format the output as simple HTML (use <strong> for emphasis). Do NOT use markdown code blocks.`;
    try {
        const res = await callGemini(prompt);
        console.log("Raw Output:\n", res);
    } catch (e) { console.error(e); }
}

async function run() {
    await testExplainDomain();
    await testVerifyRisks();
    await testActivityReport();
}

run();
