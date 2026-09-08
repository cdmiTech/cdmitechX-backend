const Student = require('../models/Student');
const Course = require('../models/Course');
const Language = require('../models/Language');
const Topic = require('../models/Topic');
const Question = require('../models/Question');
const Workbook = require('../models/Workbook');

// @desc    Get dashboard stats
// @route   GET /api/dashboard/stats
// @access  Private (Faculty)
const getDashboardStats = async (req, res) => {
    try {

        // Global sections (Seen by all faculty/admins)
        const totalStudents = await Student.countDocuments({});

        // Global sections (Seen by all faculty/admins)
        const totalWorkbooks = await Workbook.countDocuments({});
        const totalCourses = await Course.countDocuments({});
        const totalLanguages = await Language.countDocuments({});
        const totalTopics = await Topic.countDocuments({});
        const totalQuestions = await Question.countDocuments({});

        res.status(200).json({
            totalStudents,
            totalWorkbooks,
            totalCourses,
            totalLanguages,
            totalTopics,
            totalQuestions
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getDashboardStats };
