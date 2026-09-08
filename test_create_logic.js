const mongoose = require('mongoose');
const Workbook = require('./models/Workbook');
const Course = require('./models/Course');
const Language = require('./models/Language');

const MONGO_URI = 'mongodb://localhost:27017/workbook_db';

const courseId = "69904b72d9bb46929ad74473"; // fullstack
const lang1 = "6990475847b215425d7bb240"; // C
const lang2 = "6990477b47b215425d7bb27b"; // C++

// Mock user
const user = { id: "6990473a47b215425d7bb22d", role: 'faculty' }; // I need a valid faculty ID. 
// I'll assume the facultyId for Workbook #2 is valid. I'll read it first.

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);

        const existing = await Workbook.findOne({ courseId });
        console.log('Existing facultyId:', existing.facultyId);

        // Simulate request body
        const reqBody = {
            courseId: courseId,
            languages: [lang1, lang2] // Both
        };

        // Logic from controller
        let workbook = await Workbook.findOne({ courseId, facultyId: existing.facultyId });
        if (workbook) {
            console.log('Updating existing workbook...');
            workbook.languages = reqBody.languages.map(langId => ({ languageId: langId }));
            await workbook.save();
        } else {
            console.log('Creating new...');
            // ...
        }

        const updated = await Workbook.findById(workbook._id).populate('languages.languageId');
        console.log('Updated languages count:', updated.languages.length);
        updated.languages.forEach(l => console.log(' - ' + l.languageId.name));

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
