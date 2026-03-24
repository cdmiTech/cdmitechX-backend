const mongoose = require('mongoose');
const Workbook = require('./models/Workbook');
const Course = require('./models/Course');
const Language = require('./models/Language');

const MONGO_URI = 'mongodb://localhost:27017/workbook_db';

const inspect = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        const courses = await Course.find({});
        console.log('Courses:', courses.map(c => `${c.name} (${c._id})`));

        const languages = await Language.find({});
        console.log('Languages:', languages.map(l => `${l.name} (${l._id})`));

        const workbooks = await Workbook.find({})
            .populate('courseId', 'name')
            .populate('languages.languageId', 'name');

        console.log('Workbooks found:', workbooks.length);
        workbooks.forEach((wb, index) => {
            console.log(`Workbook #${index + 1} (ID: ${wb._id}):`);
            console.log(`  Course: ${wb.courseId ? wb.courseId.name : 'N/A'} (ID: ${wb.courseId ? wb.courseId._id : wb.courseId})`);
            console.log(`  Raw Course ID: ${wb.courseId ? wb.courseId._id : wb.get('courseId')}`);
            console.log(`  Languages (${wb.languages.length}):`);
            wb.languages.forEach(lang => {
                console.log(`    - ${lang.languageId ? lang.languageId.name : 'Unknown'} (ID: ${lang.languageId ? lang.languageId._id : lang.languageId})`);
            });
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

inspect();
