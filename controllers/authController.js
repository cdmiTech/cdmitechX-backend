const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const Student = require('../models/Student');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: process.env.FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}
// Generate JWT
const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public (for initial setup) / Admin
const registerUser = async (req, res) => {
    const { username, email, password, role, name } = req.body;

    if (!name || !password || (!username && !email)) {
        return res.status(400).json({ message: 'Please add all fields' });
    }

    // Check if user exists
    const userExists = await User.findOne({
        $or: [
            { username: username || 'nonexistent_placeholder' },
            { email: email || 'nonexistent_placeholder' }
        ]
    });

    if (userExists) {
        return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await User.create({
        name,
        username,
        email,
        password: hashedPassword,
        role
    });

    if (user) {
        // If student, check if they need approval (they always do on self-registration)
        const token = generateToken(user._id, user.role);
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            status: user.role === 'student' ? 'Pending' : 'Approved',
            token: token
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { username, email, password } = req.body;

    // Faculty logs in with username, Student with email
    let user;
    if (username) {
        user = await User.findOne({ username });
    } else if (email) {
        user = await User.findOne({ email });
    }

    if (user && (await bcrypt.compare(password, user.password))) {
        // If student, check if approved
        if (user.role === 'student') {
            const studentProfile = await Student.findOne({ email: user.email });
            if (studentProfile && studentProfile.status === 'Pending') {
                return res.status(200).json({
                    _id: user.id,
                    name: user.name,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    status: 'Pending',
                    token: generateToken(user._id, user.role),
                    message: 'Your account is pending CDMI approval.'
                });
            }
        }

        res.json({
            _id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            token: generateToken(user._id, user.role)
        });
    } else {
        res.status(400).json({ message: 'Invalid credentials' });
    }
};

// @desc    Authenticate with Google
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
    const { token } = req.body;

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        const { email, name, uid: googleId } = decodedToken;

        // Check if user exists (Student or Faculty/Admin)
        let user = await User.findOne({ email });

        if (user) {
            if (user.role === 'student') {
                // If it's a student, check their Student profile status
                const studentProfile = await Student.findOne({ email });

                if (!studentProfile) {
                    // Profile missing but User exists? Redirect to registration.
                    return res.status(200).json({
                        status: 'requires_registration',
                        email,
                        name,
                        googleId
                    });
                }

                if (studentProfile.status === 'Pending') {
                    return res.status(200).json({
                        _id: user.id,
                        name: user.name,
                        username: user.username,
                        email: user.email,
                        role: user.role,
                        status: 'Pending',
                        token: generateToken(user._id, user.role),
                        message: 'Your account is pending CDMI approval.'
                    });
                }
            }

            // User exists and is approved (or is faculty/admin), log them in
            return res.json({
                _id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                token: generateToken(user._id, user.role)
            });
        } else {
            // User does not exist, requires registration
            return res.status(200).json({
                status: 'requires_registration',
                email,
                name,
                googleId
            });
        }
    } catch (error) {
        console.error('Firebase verification error:', error);
        res.status(401).json({ message: 'Invalid Firebase Token' });
    }
};

// @desc    Register new student via Google
// @route   POST /api/auth/google/register
// @access  Public
const googleRegister = async (req, res) => {
    const { email, name, googleId, password, batchTime, contact, courseId, facultyId } = req.body;

    if (!email || !name || !googleId || !batchTime || !contact || !courseId || !facultyId) {
        return res.status(400).json({ message: 'Please provide all required fields' });
    }

    try {
        // Check if student profile already exists
        let studentExists = await Student.findOne({ email });
        if (studentExists) {
            return res.status(400).json({ message: 'Student profile already exists' });
        }

        // Check if user record exists
        let user = await User.findOne({ email });

        // Hash password if provided
        let hashedPassword;
        const salt = await bcrypt.genSalt(10);
        if (password) {
            hashedPassword = await bcrypt.hash(password, salt);
        } else if (user) {
            hashedPassword = user.password;
        } else {
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            hashedPassword = await bcrypt.hash(randomPassword, salt);
        }

        if (user) {
            // Update existing user to ensure profile data matches
            user.name = name;
            user.password = hashedPassword;
            user.role = 'student';
            await user.save();
        } else {
            // Create User for Login
            user = await User.create({
                name,
                email,
                username: email,
                password: hashedPassword,
                role: 'student'
            });
        }

        // Create Student Profile as Pending
        await Student.create({
            name,
            email,
            password: hashedPassword,
            batchTime,
            contact,
            courseId,
            facultyId,
            googleId,
            status: 'Pending',
            allowedLanguageIds: [] // Can be updated by faculty later if needed, or derived from course
        });

        // Return pending status and token so frontend can poll
        res.status(201).json({
            _id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            role: user.role,
            status: 'Pending',
            token: generateToken(user._id, user.role),
            message: 'Registration successful. Waiting for CDMI approval.'
        });

    } catch (error) {
        console.error('Google register error:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let status = 'Approved';
        if (user.role === 'student') {
            const studentProfile = await Student.findOne({ email: user.email });
            if (studentProfile) {
                status = studentProfile.status;
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Internal function to seed admin
const seedAdmin = async () => {
    try {
        const adminEmail = 'admin@gmail.com';
        const adminExists = await User.findOne({ email: adminEmail });

        if (!adminExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin', salt);

            await User.create({
                name: 'Admin',
                username: 'admin',
                email: adminEmail,
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Default Admin Account Created: admin@gmail.com / admin');
        }
    } catch (error) {
        console.error('Error seeding admin:', error);
    }
};

// Internal function to seed default faculty
const seedDefaultFaculty = async () => {
    try {
        const facultyEmail = 'krushi@gmail.com';
        const facultyExists = await User.findOne({ email: facultyEmail });

        if (!facultyExists) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('krushi.workbook.5503', salt);

            await User.create({
                name: 'krushi',
                username: 'krushi',
                email: facultyEmail,
                password: hashedPassword,
                role: 'faculty'
            });
            console.log('Default Faculty Account Created: krushi@gmail.com / username: krushi');
        }
    } catch (error) {
        console.error('Error seeding default faculty:', error);
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    googleRegister,
    getProfile,
    seedAdmin,
    seedDefaultFaculty
};
