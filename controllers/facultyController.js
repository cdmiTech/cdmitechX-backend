const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get all faculties
// @route   GET /api/faculty
// @access  Private (Admin)
const getFaculties = async (req, res) => {
    try {
        const faculties = await User.find({ role: 'faculty' }).select('-password');
        res.status(200).json(faculties);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Add new faculty
// @route   POST /api/faculty
// @access  Private (Admin)
const addFaculty = async (req, res) => {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password || !username) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    try {
        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const faculty = await User.create({
            name,
            email,
            username,
            password: hashedPassword,
            role: 'faculty'
        });

        res.status(201).json({
            _id: faculty.id,
            name: faculty.name,
            email: faculty.email,
            role: faculty.role
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete faculty
// @route   DELETE /api/faculty/:id
// @access  Private (Admin)
const deleteFaculty = async (req, res) => {
    try {
        const faculty = await User.findById(req.params.id);

        if (!faculty) {
            return res.status(404).json({ message: 'Faculty not found' });
        }

        if (faculty.role !== 'faculty') {
            return res.status(400).json({ message: 'Can only delete faculty' });
        }

        await faculty.deleteOne();
        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getFaculties,
    addFaculty,
    deleteFaculty
};
