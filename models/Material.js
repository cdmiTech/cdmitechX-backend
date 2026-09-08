const mongoose = require('mongoose');

const materialSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a material name'],
        trim: true
    },
    courseIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }],
    pdfs: [{
        name: {
            type: String,
            trim: true
        },
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            required: true
        },
        resource_type: {
            type: String,
            default: 'image'
        },
        order: {
            type: Number,
            default: 0
        }
    }],
    order: {
        type: Number,
        default: 0
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Material', materialSchema);
