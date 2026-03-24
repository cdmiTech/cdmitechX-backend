const dotenv = require('dotenv');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

dotenv.config();

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

/**
 * Validates a student's answer using Cloudflare AI.
 * Specifically handles images of handwritten work or code screenshots.
 * @param {string} question - The question text.
 * @param {string} studentAnswer - The text answer provided by the student (optional).
 * @param {string} languageName - The programming language context.
 * @param {string} imageUrl - URL of the uploaded image of work.
 * @returns {Promise<{isValid: boolean, message: string}>}
 */
const validateImageAnswer = async (question, studentAnswer, languageName, imageUrl) => {
    try {
        if (!imageUrl) {
            return { isValid: false, message: "Image is required for this validation." };
        }

        const languageContext = languageName
            ? `This question is specifically about the "${languageName}" programming language. Evaluate the answer strictly in the context of ${languageName} only.`
            : '';

        const prompt = `
You are a strict educational answer evaluator for a programming workbook.

${languageContext}

QUESTION: "${question}"
STUDENT'S TEXT ANSWER: "${studentAnswer || 'No text provided'}"

TASK:
Evaluate whether the student's answer is correct for the given question${languageName ? ` in the context of ${languageName}` : ''}.
An image of the student's work has been provided. If the student provided no text, evaluate based ENTIRELY on the image. The image might contain handwritten code or diagrams.

STRICT RULES:
1. If the solution is correct, respond with "CORRECT" as the very last word of your response. You may provide a brief explanation before it if helpful, but the LAST WORD must be "CORRECT".
2. If the solution is wrong, respond with a brief explanation (max 20 words) and do NOT end with the word "CORRECT".
3. Plain text only. No markdown.

YOUR RESPONSE:`;

        // Fetch the image and convert to byte array for Cloudflare
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        const imageBytes = Array.from(new Uint8Array(buffer));

        const aiResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    prompt: prompt,
                    image: imageBytes
                })
            }
        );

        if (!aiResponse.ok) {
            const errorData = await aiResponse.text();
            console.error("Cloudflare AI Error Response:", errorData);
            throw new Error(`Cloudflare API error: ${aiResponse.status} ${aiResponse.statusText}`);
        }

        const result = await aiResponse.json();
        const text = result.result?.response?.trim() || "";

        // Log for debugging
        console.log(`[Cloudflare AI] Lang: "${languageName}" | Q: "${question}" | Text: "${studentAnswer}" | Response: "${text}"`);

        // Check if the response indicates correctness.
        const upperText = text.toUpperCase().replace(/[^A-Z ]/g, '');
        const words = upperText.split(/\s+/);
        const lastWord = words[words.length - 1];

        if (lastWord === 'CORRECT') {
            return { isValid: true, message: "Correct! Well done." };
        } else {
            return { isValid: false, message: text || "Incorrect... Try Again." };
        }
    } catch (error) {
        console.error("Cloudflare Validation Error:", error);
        throw new Error("AI Validation failed. Please try again later.");
    }
};

module.exports = { validateImageAnswer };
