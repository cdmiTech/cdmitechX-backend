const dotenv = require('dotenv');
dotenv.config();

// Test multiple models to find one that works
const modelsToTest = [
    'gemini-2.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash-lite',
];

async function testModel(modelName) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: modelName });
    try {
        const result = await model.generateContent('Say CORRECT');
        const text = result.response.text().trim();
        return { model: modelName, success: true, response: text };
    } catch (err) {
        return { model: modelName, success: false, error: err.message.substring(0, 100) };
    }
}

async function main() {
    for (const m of modelsToTest) {
        console.log(`Testing: ${m}...`);
        const r = await testModel(m);
        if (r.success) {
            console.log(`  ✅ WORKS! Response: "${r.response}"`);
        } else {
            console.log(`  ❌ FAILED: ${r.error}`);
        }
    }
}

main();
