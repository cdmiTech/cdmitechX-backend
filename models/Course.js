const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a course name'],
        unique: true
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    allowedLanguageIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Language'
    }]
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
