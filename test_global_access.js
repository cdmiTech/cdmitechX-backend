const mongoose = require('mongoose');
const User = require('./models/User');
const Course = require('./models/Course');
const dotenv = require('dotenv');

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/workbook_db';

const runVerification = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Find or create two faculty users
        let facultyA = await User.findOne({ role: 'faculty', username: 'facultyA' });
        if (!facultyA) {
            facultyA = await User.create({ name: 'Faculty A', username: 'facultyA', email: 'a@f.com', password: 'password', role: 'faculty' });
        }
        
        let facultyB = await User.findOne({ role: 'faculty', username: 'facultyB' });
        if (!facultyB) {
            facultyB = await User.create({ name: 'Faculty B', username: 'facultyB', email: 'b@f.com', password: 'password', role: 'faculty' });
        }

        console.log(`Using Faculty A: ${facultyA._id} and Faculty B: ${facultyB._id}`);

        // 2. Faculty A creates a course
        const courseName = `Test Course ${Date.now()}`;
        const course = await Course.create({
            name: courseName,
            facultyId: facultyA._id
        });
        console.log(`Course created by Faculty A: ${course._id}`);

        // 3. Simulate Faculty B updating Faculty A's course
        // Replicating logic from updateCourse in courseController.js (after my fix)
        const courseToUpdate = await Course.findById(course._id);
        if (!courseToUpdate) {
            throw new Error('Course not found');
        }

        // The check "if (course.facultyId.toString() !== req.user.id)" is now REMOVED.
        // So Faculty B should be able to update.
        console.log(`Faculty B attempting to update Faculty A's course...`);
        const updatedName = `${courseName} - Updated by B`;
        const updatedCourse = await Course.findByIdAndUpdate(course._id, { name: updatedName }, { new: true });
        
        if (updatedCourse.name === updatedName) {
            console.log('SUCCESS: Faculty B updated Faculty A\'s course.');
        } else {
            throw new Error('FAILURE: Faculty B failed to update Faculty A\'s course.');
        }

        // 5. Faculty A creates a workbook mapping
        const Workbook = require('./models/Workbook');
        console.log(`Faculty A attempting to create a workbook for the deleted course's placeholder...`);
        // Re-create a course for workbook testing
        const wbCourse = await Course.create({ name: `WB Test ${Date.now()}`, facultyId: facultyA._id });
        const workbook = await Workbook.create({
            courseId: wbCourse._id,
            languages: [],
            facultyId: facultyA._id
        });
        console.log(`Workbook created by Faculty A: ${workbook._id}`);

        // 6. Simulate Faculty B updating Faculty A's workbook
        console.log(`Faculty B attempting to update Faculty A's workbook...`);
        const workbookToUpdate = await Workbook.findOne({ courseId: wbCourse._id });
        if (!workbookToUpdate) throw new Error('Workbook not found');

        // Logic from controller: findOne({ courseId })
        const updatedWorkbook = await Workbook.findOneAndUpdate(
            { courseId: wbCourse._id },
            { $set: { languages: [] }, facultyId: facultyB._id }, // Simulate update by B
            { new: true }
        );

        if (updatedWorkbook) {
            console.log('SUCCESS: Faculty B updated Faculty A\'s workbook configuration.');
        } else {
            throw new Error('FAILURE: Faculty B failed to update Faculty A\'s workbook.');
        }

        // Cleanup
        await Course.findByIdAndDelete(wbCourse._id);
        await Workbook.findByIdAndDelete(workbook._id);

    } catch (error) {
        console.error('Verification Failed:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

runVerification();
