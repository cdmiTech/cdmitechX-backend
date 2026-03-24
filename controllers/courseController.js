const Course = require('../models/Course');

// @desc    Get all courses (Faculty specific)
// @route   GET /api/courses
// @access  Private
const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({}).populate('allowedLanguageIds', 'name');
        res.status(200).json(courses);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new course
// @route   POST /api/courses
// @access  Private (Faculty)
const createCourse = async (req, res) => {
    if (!req.body.name) {
        return res.status(400).json({ message: 'Please add a course name' });
    }

    try {
        const courseExists = await Course.findOne({ name: req.body.name });
        if (courseExists) {
            return res.status(400).json({ message: 'Already exist' });
        }

        const course = await Course.create({
            name: req.body.name,
            facultyId: req.user.id,
            allowedLanguageIds: req.body.allowedLanguageIds || []
        });
        res.status(200).json(course);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private (Faculty)
const updateCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        // Duplicate check on update
        if (req.body.name && req.body.name !== course.name) {
            const courseExists = await Course.findOne({ name: req.body.name });
            if (courseExists) {
                return res.status(400).json({ message: 'Already exist' });
            }
        }

        const updatedCourse = await Course.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        }).populate('allowedLanguageIds', 'name');

        res.status(200).json(updatedCourse);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private (Faculty)
const deleteCourse = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);

        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        await course.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCourses,
    createCourse,
    updateCourse,
    deleteCourse
};
