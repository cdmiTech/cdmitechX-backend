const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

function listModels() {
    console.log("Fetching models list...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;

    https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            console.log("Status Code:", res.statusCode);
            try {
                const json = JSON.parse(data);
                if (json.models) {
                    console.log("Available Models:");
                    json.models.forEach(m => console.log(` - ${m.name} (${m.displayName})`));
                } else {
                    console.log("No models returned. Response:", JSON.stringify(json, null, 2));
                }
            } catch (e) {
                console.log("Failed to parse response:", data);
            }
        });
    }).on('error', (err) => {
        console.error("Request Error:", err.message);
    });
}

listModels();
