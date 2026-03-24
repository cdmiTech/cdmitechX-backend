const dotenv = require('dotenv');
dotenv.config();

async function test() {
    const fetch = (await import('node-fetch')).default || globalThis.fetch;
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST',
        headers: {
            "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            prompt: "Hello, answer with one word: 'Success'"
        })
    });
    console.log("Status:", res.status);
    console.log("Body:", await res.text());
}
test();
