const dotenv = require('dotenv');
dotenv.config();

async function testFetch() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        console.log(`Testing URL: ${url.replace(apiKey, 'REDACTED')}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (response.ok) {
            console.log("Flash Models found:");
            data.models.filter(m => m.name.toLowerCase().includes('flash'))
                .forEach(m => console.log(`- ${m.name}`));
        } else {
            console.log(`Error: ${response.status} ${response.statusText}`);
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error("Fetch Error:", error.message);
    }
}

testFetch();
