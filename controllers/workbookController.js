const Workbook = require('../models/Workbook');

// @desc    Get workbooks
// @route   GET /api/workbooks
// @access  Private
const getWorkbooks = async (req, res) => {
    try {
        const query = {};
        // Enhance query if needed (e.g. by courseId)
        if (req.query.courseId) query.courseId = req.query.courseId;

        const workbooks = await Workbook.find(query)
            .populate('courseId', 'name')
            .populate('languages.languageId', 'name');
        res.status(200).json(workbooks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create workbook (Define languages for a course)
// @route   POST /api/workbooks
// @access  Private (Faculty)
const createWorkbook = async (req, res) => {
    const { courseId, languages } = req.body;
    // languages should be an array of objects or IDs. 
    // Based on requirements: "Languages reusable across courses"
    // And "No duplicate entries allowed" -> Check if workbook for course exists?
    // Requirement says "Click submit -> workbook created".

    if (!courseId || !languages || languages.length === 0) {
        return res.status(400).json({ message: 'Please select course and languages' });
    }

    try {
        // Check if workbook for this course already exists, if so, maybe update it?
        // Or "No duplicate entries allowed" means don't creating identical mapping.
        // Let's assume one workbook configuration per course for simplicity, or just update the existing one.
        let workbook = await Workbook.findOne({ courseId });

        if (workbook) {
            // Update existing
            workbook.languages = languages.map(langId => ({ languageId: langId }));
            await workbook.save();
        } else {
            // Create new
            workbook = await Workbook.create({
                courseId,
                languages: languages.map(langId => ({ languageId: langId })),
                facultyId: req.user.id
            });
        }
        res.status(200).json(workbook);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getWorkbooks,
    createWorkbook
};
