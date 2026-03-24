const mongoose = require('mongoose');
const Submission = require('./models/Submission');
const Student = require('./models/Student');
const User = require('./models/User'); // For mock faculty

const MONGO_URI = 'mongodb://localhost:27017/workbook_db';

const run = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to DB');

        // 1. Find a faculty
        const faculty = await User.findOne({ role: 'faculty' });
        if (!faculty) {
            console.log('No faculty found');
            return;
        }
        console.log('Faculty:', faculty.name);

        const facultyId = faculty._id;

        // 2. Logic from controller (simplified)
        const date = new Date();
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        console.log('Date range:', startOfDay, 'to', endOfDay);

        const allStudents = await Student.find({ facultyId: facultyId }).select('name email');
        console.log('All Students:', allStudents.length);

        const studentIds = allStudents.map(s => s._id);
        const submissions = await Submission.find({
            studentId: { $in: studentIds },
            submittedAt: { $gte: startOfDay, $lte: endOfDay }
        });

        console.log('Submissions today:', submissions.length);

        // Grouping logic...
        const submissionMap = {};
        submissions.forEach(sub => {
            const sId = sub.studentId.toString();
            if (!submissionMap[sId]) {
                submissionMap[sId] = {
                    submissions: [],
                    count: 0
                };
            }
            submissionMap[sId].submissions.push(sub);
            submissionMap[sId].count++;
        });

        console.log('Submitted Students:', Object.keys(submissionMap).length);

        const notSubmitted = allStudents.filter(student =>
            !submissionMap[student._id.toString()]
        );
        console.log('Not Submitted Students:', notSubmitted.length);


    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
    }
};

run();
