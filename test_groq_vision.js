const { validateAnswer } = require('./utils/groqService');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
    // Testing with a public image URL
    const imageUrl = "https://res.cloudinary.com/dgmmsxdaw/image/upload/v1740640164/workbook/r9pivw88idub7atv1bzu.png";
    const question = "Print table of 10 no.";
    const answerText = "";
    const languageName = "C";

    try {
        console.log("Testing Groq Vision Fallback...");
        const result = await validateAnswer(question, answerText, languageName, imageUrl);
        console.log("Result:", result);
    } catch (error) {
        console.error("Error:", error.message);
    }
}
test();
