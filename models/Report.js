const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Student'
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    date: {
        type: Date,
        required: true
    },
    languageId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Language'
    },
    topicIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Topic' }],
        required: true,
        validate: { validator: (v) => v.length > 0, message: 'At least one topic is required' }
    },
    projectWorkTitles: {
        type: [String],
        default: []
    },
    description: {
        type: String,
        required: true
    }
}, { timestamps: true });

// Ensure one report per student per date
reportSchema.index({ studentId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema);
