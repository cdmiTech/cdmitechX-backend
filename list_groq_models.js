const Groq = require("groq-sdk");
const dotenv = require('dotenv');
dotenv.config();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function listModels() {
    try {
        const models = await groq.models.list();
        console.log(JSON.stringify(models.data.map(m => m.id), null, 2));
    } catch (error) {
        console.error(error);
    }
}
listModels();
