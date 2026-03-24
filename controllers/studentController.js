const Student = require('../models/Student');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ... (existing imports)

// ...
// @desc    Get students
// @route   GET /api/students
// @access  Private (Faculty)
const getStudents = async (req, res) => {
    try {
        // If a specific facultyId is provided in query, use it; otherwise default to logged-in faculty
        const facultyId = req.query.facultyId || req.user.id;
        const query = { facultyId };

        const students = await Student.find(query)
            .populate('courseId', 'name')
            .populate('allowedLanguageIds', 'name')
            .populate('facultyId', 'name');
        res.status(200).json(students);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createStudent = async (req, res) => {
    const { name, email, password, batchTime, contact, courseId, allowedLanguageIds } = req.body;

    if (!name || !email || !password || !batchTime || !contact || !courseId) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    try {
        const studentExists = await Student.findOne({ email });
        if (studentExists) {
            return res.status(400).json({ message: 'Student already exists' });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: 'User (Login) already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create User for Login
        await User.create({
            name,
            email,
            username: email, // Use email as username for students
            password: hashedPassword,
            role: 'student'
        });

        // Create Student Profile
        const student = await Student.create({
            name,
            email,
            password: hashedPassword,
            batchTime,
            contact,
            courseId,
            allowedLanguageIds: allowedLanguageIds || [],
            facultyId: req.user.id
        });

        res.status(200).json(student);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Faculty)
const updateStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // If password is being updated, hash it
        if (req.body.password) {
            const salt = await bcrypt.genSalt(10);
            req.body.password = await bcrypt.hash(req.body.password, salt);
        }

        const updatedStudent = await Student.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
        }).populate('courseId', 'name').populate('allowedLanguageIds', 'name');

        res.status(200).json(updatedStudent);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Faculty)
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        await student.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current student profile
// @route   GET /api/students/me
// @access  Private (Student)
const getMe = async (req, res) => {
    try {
        const student = await Student.findOne({ email: req.user.email })
            .populate('courseId', 'name')
            .populate('allowedLanguageIds', 'name')
            .populate('facultyId', 'name');

        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }
        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Approve a student
// @route   PUT /api/students/:id/approve
// @access  Private (Faculty)
const approveStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Only allow faculty to approve if they are assigned to this student, 
        // or bypass if admin (assuming faculty context for now)
        if (student.facultyId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized to approve this student' });
        }

        student.status = 'Approved';
        await student.save();

        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    getMe,
    approveStudent
};
