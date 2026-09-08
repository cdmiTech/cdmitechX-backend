const { validateAnswer } = require('./utils/geminiService');
const dotenv = require('dotenv');
dotenv.config();

const runTests = async () => {
    console.log("--- Language-Aware Validation Tests ---\n");

    const tests = [
        {
            name: "C: correct answer",
            question: "How do you declare a pointer in C?",
            answer: "int *ptr;",
            language: "C"
        },
        {
            name: "C++: correct answer",
            question: "How do you declare a pointer in C++?",
            answer: "int *ptr;",
            language: "C++"
        },
        {
            name: "C: C++ answer given (should fail)",
            question: "How do you print Hello World in C?",
            answer: "cout << \"Hello World\";",
            language: "C"
        },
        {
            name: "C: correct C answer",
            question: "How do you print Hello World in C?",
            answer: "printf(\"Hello World\");",
            language: "C"
        },
        {
            name: "Python: correct answer",
            question: "How do you print Hello World in Python?",
            answer: "print('Hello World')",
            language: "Python"
        },
        {
            name: "Python: C answer given (should fail)",
            question: "How do you print Hello World in Python?",
            answer: "printf(\"Hello World\");",
            language: "Python"
        }
    ];

    for (const t of tests) {
        console.log(`Test: ${t.name}`);
        console.log(`  Lang: ${t.language} | Q: ${t.question}`);
        console.log(`  A: "${t.answer}"`);
        try {
            const result = await validateAnswer(t.question, t.answer, t.language);
            console.log(`  isValid: ${result.isValid} ${result.isValid ? '✅' : '❌'}`);
            console.log(`  Message: ${result.message}`);
        } catch (err) {
            console.log(`  ERROR: ${err.message}`);
        }
        console.log();
    }
};

runTests();
