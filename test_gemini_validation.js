const { validateAnswer } = require('./utils/geminiService');

const testValidation = async () => {
    console.log("--- Starting Gemini Validation Tests ---");

    const tests = [
        {
            name: "Correct Answer (Exact Match)",
            question: "What is the capital of France?",
            studentAnswer: "Paris",
            validationLogic: "The answer must be Paris."
        },
        {
            name: "Correct Answer (Slight Variation)",
            question: "What is the capital of France?",
            studentAnswer: "It is Paris",
            validationLogic: "The answer must be Paris."
        },
        {
            name: "Incorrect Answer",
            question: "What is the capital of France?",
            studentAnswer: "London",
            validationLogic: "The answer must be Paris."
        },
        {
            name: "Logic-based Validation (Correct)",
            question: "Explain why the Earth is round.",
            studentAnswer: "Because of gravity pulling all mass to the center.",
            validationLogic: "The answer should mention gravity and pulling mass to a center point."
        },
        {
            name: "Logic-based Validation (Incorrect)",
            question: "Explain why the Earth is round.",
            studentAnswer: "Because it's a flat disk in space.",
            validationLogic: "The answer should mention gravity and pulling mass to a center point."
        }
    ];

    for (const t of tests) {
        console.log(`\nRunning Test: ${t.name}`);
        console.log(`Question: ${t.question}`);
        console.log(`Student Answer: ${t.studentAnswer}`);
        try {
            const result = await validateAnswer(t.question, t.studentAnswer, t.validationLogic);
            console.log(`Result: ${result.isValid ? "✅ PASS" : "❌ FAIL"}`);
            console.log(`Message: ${result.message}`);
        } catch (error) {
            console.error(`Error in test ${t.name}:`, error.message);
        }
    }

    console.log("\n--- Tests Completed ---");
};

testValidation();
