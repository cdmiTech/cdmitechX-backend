const mongoose = require('mongoose');

const workbookSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    // We store languages here as a reference to what's included in this workbook configuration
    languages: [{
        languageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Language'
        }
    }],
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    }
}, { timestamps: true });

module.exports = mongoose.model('Workbook', workbookSchema);
