const Question = require('../models/Question');
const { uploadPhoto } = require('../utils/cloudinary');

// @desc    Get questions
// @route   GET /api/questions
// @access  Private
const getQuestions = async (req, res) => {
    try {
        let query = {};

        if (req.query.topicId) {
            query.topicId = req.query.topicId;
        }
        if (req.query.languageId) {
            query.languageId = req.query.languageId;
        }

        const questions = await Question.find(query)
            .populate('topicId', 'name')
            .populate('languageId', 'name')
            .sort({ order: 1, createdAt: 1 }); // Sorted by order, then time

        res.status(200).json(questions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create question
// @route   POST /api/questions
// @access  Private (Faculty)
const createQuestion = async (req, res) => {
    const { question, languageId, topicId, validationLogic } = req.body;
    let imageUrl = '';

    if ((!question && !req.file) || !languageId || !topicId) {
        return res.status(400).json({ message: 'Please add either a question text or an image' });
    }

    try {
        // Duplicate check (only applies if a question text is provided)
        if (question) {
            const questionExists = await Question.findOne({
                question,
                languageId,
                topicId
            });
            if (questionExists) {
                return res.status(400).json({ message: 'Already exist' });
            }
        }

        // Handle image upload if a file is provided
        if (req.file) {
            try {
                const uploadResult = await uploadPhoto(req.file.buffer, 'workbook/questions', req.file.originalname || 'question');
                imageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ message: "Failed to upload image to Cloudinary" });
            }
        }

        // Get count of questions in this topic for auto-ordering
        const count = await Question.countDocuments({ topicId });

        const questionData = await Question.create({
            question,
            languageId,
            topicId,
            facultyId: req.user.id,
            validationLogic: validationLogic || '',
            imageUrl,
            order: count
        });
        res.status(200).json(questionData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update question
// @route   PUT /api/questions/:id
// @access  Private (Faculty)
const updateQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        // Duplicate check on update
        const newText = req.body.question !== undefined ? req.body.question : question.question;
        const newLanguageId = req.body.languageId || question.languageId;
        const newTopicId = req.body.topicId || question.topicId;

        if (
            newText && // only check if it actually has text
            (newText !== question.question ||
                newLanguageId.toString() !== question.languageId.toString() ||
                newTopicId.toString() !== question.topicId.toString())
        ) {
            const questionExists = await Question.findOne({
                question: newText,
                languageId: newLanguageId,
                topicId: newTopicId
            });
            if (questionExists) {
                return res.status(400).json({ message: 'Already exist' });
            }
        }

        let updateData = { ...req.body };

        // Handle image upload if a new file is provided
        if (req.file) {
            try {
                const uploadResult = await uploadPhoto(req.file.buffer, 'workbook/questions', req.file.originalname || 'question');
                updateData.imageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error("Cloudinary Upload Error:", uploadError);
                return res.status(500).json({ message: "Failed to upload image to Cloudinary" });
            }
        }

        const updatedQuestion = await Question.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
        }).populate('languageId', 'name').populate('topicId', 'name');

        res.status(200).json(updatedQuestion);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete question
// @route   DELETE /api/questions/:id
// @access  Private (Faculty)
const deleteQuestion = async (req, res) => {
    try {
        const question = await Question.findById(req.params.id);

        if (!question) {
            return res.status(404).json({ message: 'Question not found' });
        }

        await question.deleteOne();

        res.status(200).json({ id: req.params.id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Bulk Reorder questions
// @route   PATCH /api/questions/reorder
// @access  Private (Faculty)
const reorderQuestions = async (req, res) => {
    const { questions } = req.body; // Array of { _id, order }

    if (!Array.isArray(questions)) {
        return res.status(400).json({ message: 'Questions array is required' });
    }

    try {
        const bulkOps = questions.map(q => ({
            updateOne: {
                filter: { _id: q._id }, // Removed ownership check
                update: { order: q.order }
            }
        }));

        await Question.bulkWrite(bulkOps);
        res.status(200).json({ message: 'Order updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    reorderQuestions
};
