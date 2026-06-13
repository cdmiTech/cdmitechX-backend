const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const Student = require('../models/Student');

// Initialize Firebase Admin - Primary Project
let secondaryAdminApp;
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            project_id: process.env.FIREBASE_PROJECT_ID,
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
    console.log('[Firebase] Primary admin app initialized:', process.env.FIREBASE_PROJECT_ID);
}

// Initialize Firebase Admin - Secondary Project
try {
    if (process.env.FIREBASE_PROJECT_ID_2 && process.env.FIREBASE_CLIENT_EMAIL_2 && process.env.FIREBASE_PRIVATE_KEY_2) {
        const existingApp2 = admin.apps.find(app => app.name === 'app2');
        if (!existingApp2) {
            secondaryAdminApp = admin.initializeApp({
                credential: admin.credential.cert({
                    project_id: process.env.FIREBASE_PROJECT_ID_2,
                    client_email: process.env.FIREBASE_CLIENT_EMAIL_2,
                    private_key: process.env.FIREBASE_PRIVATE_KEY_2.replace(/\\n/g, '\n'),
                }),
            }, 'app2');
            console.log('[Firebase] Secondary admin app initialized:', process.env.FIREBASE_PROJECT_ID_2);
        } else {
            secondaryAdminApp = existingApp2;
            console.log('[Firebase] Secondary admin app reused:', process.env.FIREBASE_PROJECT_ID_2);
        }
    } else {
        console.warn('[Firebase] Secondary project env vars missing — only primary project active.');
    }
} catch (initErr) {
    console.error('[Firebase] Failed to initialize secondary admin app:', initErr.message);
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
        // If student, check if approved or job done
        let courseCompleted = false;
        let jobDone = false;

        if (user.role === 'student') {
            const studentProfile = await Student.findOne({ email: user.email });
            if (studentProfile) {
                if (studentProfile.jobDone) {
                    return res.status(403).json({ message: 'Account disabled.' });
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
                courseCompleted = studentProfile.courseCompleted || false;
                jobDone = studentProfile.jobDone || false;
            }
        }

        res.json({
            _id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            courseCompleted,
            jobDone,
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
        let decodedToken;
        const decodedJWT = jwt.decode(token);
        const audience = decodedJWT ? decodedJWT.aud : null;

        console.log('[googleLogin] Token audience (project):', audience);
        console.log('[googleLogin] Project1 ID:', process.env.FIREBASE_PROJECT_ID);
        console.log('[googleLogin] Project2 ID:', process.env.FIREBASE_PROJECT_ID_2);
        console.log('[googleLogin] secondaryAdminApp exists:', !!secondaryAdminApp);

        // Verify token: try the matching project first, then fall back to the other
        if (audience === process.env.FIREBASE_PROJECT_ID_2 && secondaryAdminApp) {
            // Token is from Project 2
            try {
                decodedToken = await secondaryAdminApp.auth().verifyIdToken(token);
                console.log('[googleLogin] Verified with Project 2 (secondary)');
            } catch (err2) {
                console.warn('[googleLogin] Project 2 verification failed, trying Project 1 fallback:', err2.message);
                decodedToken = await admin.auth().verifyIdToken(token);
                console.log('[googleLogin] Verified with Project 1 (primary) fallback');
            }
        } else if (audience === process.env.FIREBASE_PROJECT_ID) {
            // Token is from Project 1
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
                console.log('[googleLogin] Verified with Project 1 (primary)');
            } catch (err1) {
                console.warn('[googleLogin] Project 1 verification failed, trying Project 2 fallback:', err1.message);
                if (secondaryAdminApp) {
                    decodedToken = await secondaryAdminApp.auth().verifyIdToken(token);
                    console.log('[googleLogin] Verified with Project 2 (secondary) fallback');
                } else {
                    throw err1;
                }
            }
        } else {
            // Unknown audience — try Project 2 first (new default), then Project 1
            console.warn('[googleLogin] Unknown token audience:', audience, '— trying both projects');
            try {
                if (secondaryAdminApp) {
                    decodedToken = await secondaryAdminApp.auth().verifyIdToken(token);
                    console.log('[googleLogin] Verified with Project 2 (secondary) for unknown audience');
                } else {
                    decodedToken = await admin.auth().verifyIdToken(token);
                    console.log('[googleLogin] Verified with Project 1 (primary) for unknown audience');
                }
            } catch (errUnknown) {
                decodedToken = await admin.auth().verifyIdToken(token);
                console.log('[googleLogin] Verified with Project 1 (primary) fallback for unknown audience');
            }
        }

        const { email, name, uid: googleId } = decodedToken;

        // Check if user exists (Student or Faculty/Admin)
        let user = await User.findOne({ email });

        if (user) {
            let courseCompleted = false;
            let jobDone = false;

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

                if (studentProfile.jobDone) {
                    return res.status(403).json({ message: 'Account disabled.' });
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

                courseCompleted = studentProfile.courseCompleted || false;
                jobDone = studentProfile.jobDone || false;
            }

            // User exists and is approved (or is faculty/admin), log them in
            return res.json({
                _id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                courseCompleted,
                jobDone,
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
        let courseCompleted = false;
        let jobDone = false;
        if (user.role === 'student') {
            const studentProfile = await Student.findOne({ email: user.email });
            if (studentProfile) {
                status = studentProfile.status;
                courseCompleted = studentProfile.courseCompleted || false;
                jobDone = studentProfile.jobDone || false;
            }
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            status,
            courseCompleted,
            jobDone
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

// @desc    Check if an email exists in MongoDB and determine Firebase project
// @route   POST /api/auth/check-email
// @access  Public
const checkEmail = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }
    try {
        const targetEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: targetEmail });
        
        let firebaseProject = null;

        if (user) {
            // Check if they exist in Firebase-1
            try {
                await admin.auth().getUserByEmail(targetEmail);
                firebaseProject = 1;
            } catch (err1) {
                // If not in Firebase-1, check Firebase-2
                if (typeof secondaryAdminApp !== 'undefined' && secondaryAdminApp) {
                    try {
                        await secondaryAdminApp.auth().getUserByEmail(targetEmail);
                        firebaseProject = 2;
                    } catch (err2) {
                        firebaseProject = 1; // Default fallback if missing from both
                    }
                } else {
                    firebaseProject = 1;
                }
            }
        }

        res.json({ exists: !!user, firebaseProject });
    } catch (error) {
        console.error('Check email error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    googleLogin,
    googleRegister,
    getProfile,
    seedAdmin,
    seedDefaultFaculty,
    checkEmail
};
