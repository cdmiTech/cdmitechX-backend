const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    languageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Language'
    },
    topicId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Topic'
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Question'
    },
    answerText: {
        type: String,
    },
    imageUrl: {
        type: String,
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Submission', submissionSchema);
