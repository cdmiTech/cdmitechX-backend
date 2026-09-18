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
        const { facultyId, completed } = req.query;
        let query = {};

        if (facultyId && facultyId !== 'all') {
            query.facultyId = facultyId;
        } else if (facultyId === 'all' || facultyId === '') {
            // All faculties, do not filter by facultyId
        } else if (facultyId === undefined && req.user && req.user.role === 'faculty') {
            query.facultyId = req.user.id;
        }

        if (completed === 'true') {
            query.courseCompleted = true;
        } else {
            query.courseCompleted = { $ne: true };
        }

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
    const { name, email, password, batchTime, contact, parentContact, courseId, allowedLanguageIds } = req.body;

    if (!name || !email || !password || !batchTime || !contact || !parentContact || !courseId) {
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
            parentContact,
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

// @desc    Mark student course completed
// @route   PUT /api/students/:id/complete-course
// @access  Private (Faculty/Admin)
const completeCourse = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (student.facultyId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        student.courseCompleted = true;
        student.courseCompletedDate = new Date();
        await student.save();

        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark student job done
// @route   PUT /api/students/:id/job-done
// @access  Private (Faculty/Admin)
const markJobDone = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({ message: 'Student not found' });
        }

        if (student.facultyId.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(401).json({ message: 'Not authorized' });
        }

        student.jobDone = true;
        await student.save();

        res.status(200).json(student);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all students by faculty name
// @route   GET /api/students/by-faculty?facultyName=... or GET /api/students/by-faculty/:facultyName
// @access  Public
const getStudentsByFacultyName = async (req, res) => {
    try {
        const facultyName = req.query.facultyName || req.query.name || req.params.facultyName || req.body?.facultyName;

        if (!facultyName || !facultyName.trim()) {
            return res.status(400).json({ message: 'Please provide a faculty name (e.g. ?facultyName=John or /by-faculty/John)' });
        }

        // Search for faculty by name or username (case-insensitive)
        const faculties = await User.find({
            role: 'faculty',
            $or: [
                { name: { $regex: facultyName.trim(), $options: 'i' } },
                { username: { $regex: facultyName.trim(), $options: 'i' } }
            ]
        });

        if (!faculties || faculties.length === 0) {
            return res.status(404).json({ message: `No faculty found with name: ${facultyName}` });
        }

        const facultyIds = faculties.map(f => f._id);

        // Find all students assigned to this faculty
        const students = await Student.find({
            facultyId: { $in: facultyIds }
        })
            .populate('facultyId', 'name username')
            .sort({ createdAt: -1 });

        const formattedStudents = students.map(student => ({
            id: student._id,
            studentName: student.name,
            phoneNo: student.contact || '',
            parentNo: student.parentContact || '',
            batchTime: student.batchTime || '',
            facultyName: student.facultyId?.name || student.facultyId?.username || '',
            created_at: student.createdAt
        }));

        res.status(200).json(formattedStudents);
    } catch (error) {
        console.error('Error fetching students by faculty name:', error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    getMe,
    approveStudent,
    completeCourse,
    markJobDone,
    getStudentsByFacultyName
};
