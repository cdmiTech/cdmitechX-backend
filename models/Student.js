const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password']
    },
    batchTime: {
        type: String,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    allowedLanguageIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Language'
    }],
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved'],
        default: 'Approved'
    },
    googleId: {
        type: String,
        sparse: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
