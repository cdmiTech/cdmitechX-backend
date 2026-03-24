const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

async function test() {
    console.log("Starting Gemini API Test...");
    console.log("API Key found:", process.env.GEMINI_API_KEY ? "Yes" : "No");

    if (!process.env.GEMINI_API_KEY) {
        console.error("No API key found in .env");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        console.log("Listing available models...");
        // Listing models requires a specific client or method if using the generative AI SDK 
        // Actually, the SDK doesn't expose a simple listModels on genAI easily without discovery.
        // Let's just try another common name: "gemini-1.5-flash" is usually correct.
        // Maybe it's "gemini-1.5-flash-001" or "gemini-1.5-flash-latest"?

        const models = ["gemini-pro-latest", "gemini-2.0-flash-lite", "gemini-2.5-flash-lite"];

        for (const modelName of models) {
            console.log(`Testing model: ${modelName}`);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Respond with only the word 'SUCCESS'");
                const response = await result.response;
                console.log(`Success with ${modelName}: ${response.text()}`);
                return;
            } catch (err) {
                console.error(`Failed with ${modelName}:`, err);
            }
        }
    } catch (error) {
        console.error("Test Failed!");
        console.error("Error Message:", error.message);
        console.error("Full Error:", error);
    }
}

test();
