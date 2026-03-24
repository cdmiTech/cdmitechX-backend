const Submission = require('../models/Submission');
const Student = require('../models/Student'); // Import Student model
const Question = require('../models/Question'); // Import Question model
const { validateAnswer } = require('../utils/groqService');
const { validateImageAnswer } = require('../utils/cloudflareService');
const { uploadPhoto } = require('../utils/cloudinary');

// @desc    Get submissions
// @route   GET /api/submissions
// @access  Private (Faculty)
// @desc    Get submissions (Grouped by student, filtered by date)
// @route   GET /api/submissions
// @access  Private (Faculty)
const getSubmissions = async (req, res) => {
    try {
        const { date, studentName, facultyId } = req.query;

        let studentQuery = {};
        if (facultyId && facultyId !== 'all') {
            studentQuery.facultyId = facultyId;
        } else if (facultyId === 'all') {
            // Show all students
            studentQuery = {};
        } else {
            // Default to all students if no facultyId is provided (as per previous global access req)
            // But usually the frontend will provide it now.
            studentQuery = {};
        }

        // Filter by student name if provided
        if (studentName) {
            studentQuery.name = { $regex: studentName, $options: 'i' };
        }

        const allStudents = await Student.find(studentQuery).select('name email contact batchTime _id');

        // 2. Define date range (default to today)
        const queryDate = date ? new Date(date) : new Date();
        const startOfDay = new Date(queryDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(queryDate.setHours(23, 59, 59, 999));

        // 3. Get all submissions for these students within the date range
        // Note: We filter submissions by the students we found (to respect the name filter if active)
        const studentIds = allStudents.map(s => s._id);

        const submissions = await Submission.find({
            studentId: { $in: studentIds },
            submittedAt: { $gte: startOfDay, $lte: endOfDay }
        })
            .populate('studentId', 'name email batchTime')
            .populate('courseId', 'name')
            .populate('languageId', 'name')
            .populate('topicId', 'name')
            .populate('questionId', 'question')
            .sort({ submittedAt: -1 });

        // 4. Group submissions by Student
        const submissionMap = {};
        submissions.forEach(sub => {
            const sId = sub.studentId._id.toString();
            if (!submissionMap[sId]) {
                submissionMap[sId] = {
                    student: sub.studentId,
                    submissions: [],
                    count: 0
                };
            }
            submissionMap[sId].submissions.push(sub);
            submissionMap[sId].count++;
        });

        // 5. Separate into Submitted and Not Submitted
        const submitted = Object.values(submissionMap);

        const notSubmitted = allStudents.filter(student =>
            !submissionMap[student._id.toString()]
        );

        res.status(200).json({
            date: startOfDay,
            submitted,
            notSubmitted
        });
    } catch (error) {
        console.error('Error getting submissions:', error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create submission
// @route   POST /api/submissions
// @access  Private (Student)
const createSubmission = async (req, res) => {
    const { courseId, languageId, topicId, questionId, answerText, facultyId } = req.body;
    let { imageUrl } = req.body;

    if (!courseId || !languageId || !topicId || !questionId || !facultyId) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!answerText && !req.file && !imageUrl) {
        return res.status(400).json({ message: 'At least one of answer text or image is required.' });
    }

    try {
        // Handle image upload if a file is provided
        if (req.file) {
            try {
                const uploadResult = await uploadPhoto(req.file.buffer, 'workbook/submissions', req.file.originalname || 'submission');
                imageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ message: "Failed to upload image to Cloudinary" });
            }
        }

        // Find the Student document corresponding to the logged-in User
        const student = await Student.findOne({ email: req.user.email });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found for this user' });
        }

        // Check if already submitted — if so, return existing submission without re-validating
        let submission = await Submission.findOne({
            studentId: student._id,
            questionId
        });

        if (submission) {
            // Already submitted correctly — just return the existing submission
            return res.status(200).json(submission);
        }

        // Gemini AI Validation — no stored answer needed, AI evaluates directly
        const questionData = await Question.findById(questionId).populate('languageId', 'name');
        if (!questionData) {
            return res.status(404).json({ message: 'Question not found.' });
        }
        const languageName = questionData.languageId?.name || '';
        try {
            let validation;
            if (imageUrl) {
                try {
                    validation = await validateImageAnswer(questionData.question, answerText, languageName, imageUrl);
                } catch (cfError) {
                    console.error("Cloudflare AI Validation failed, falling back to Groq:", cfError.message);
                    // Fallback to Groq if Cloudflare fails (e.g. invalid token)
                    validation = await validateAnswer(questionData.question, answerText, languageName, imageUrl);
                }
            } else {
                validation = await validateAnswer(questionData.question, answerText, languageName, null);
            }

            if (!validation.isValid) {
                // Return 400 with the AI's feedback message — do NOT save the submission
                return res.status(400).json({ message: validation.message });
            }
        } catch (aiError) {
            console.error("AI Validation Error:", aiError);
            return res.status(500).json({ message: aiError.message || "Error validating answer via AI. Please try again later." });
        }

        // Answer is correct — save the new submission
        submission = await Submission.create({
            studentId: student._id,
            courseId,
            languageId,
            topicId,
            questionId,
            answerText,
            imageUrl,
            facultyId
        });
        res.status(200).json(submission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get submissions for a specific student (Faculty view)
// @route   GET /api/submissions/student/:studentId
// @access  Private (Faculty)
const getStudentSubmissions = async (req, res) => {
    try {
        const { studentId } = req.params;
        const submissions = await Submission.find({ studentId })
            .populate('courseId', 'name')
            .populate('languageId', 'name')
            .populate('topicId', 'name')
            .populate('questionId', 'question')
            .sort({ submittedAt: -1 }); // Latest first
        res.status(200).json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get my submissions
// @route   GET /api/submissions/my
// @access  Private (Student)
const getMySubmissions = async (req, res) => {
    try {
        // Find the Student document first
        const student = await Student.findOne({ email: req.user.email });
        if (!student) {
            return res.status(200).json([]); // No profile, so no submissions
        }

        const submissions = await Submission.find({ studentId: student._id })
            .populate('courseId', 'name')
            .populate('languageId', 'name')
            .populate('topicId', 'name')
            .populate('questionId', 'question');
        res.status(200).json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSubmissions,
    createSubmission,
    getMySubmissions,
    getStudentSubmissions
};
