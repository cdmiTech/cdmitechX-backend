const mongoose = require('mongoose');

const successStudentSchema = new mongoose.Schema({
    imageUrl: {
        type: String,
        required: [true, 'Please provide an image URL']
    },
    public_id: {
        type: String,
        default: ''
    },
    originalName: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    facultyName: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('SuccessStudent', successStudentSchema);
