const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Please provide an announcement title'],
        trim: true
    },
    description: {
        type: String,
        default: '',
        trim: true
    },
    images: [{
        url: {
            type: String,
            required: true
        },
        public_id: {
            type: String,
            default: ''
        },
        name: {
            type: String,
            default: 'announcement_image'
        }
    }],
    link: {
        type: String,
        default: '',
        trim: true
    },
    linkButtonText: {
        type: String,
        default: 'Learn More',
        trim: true
    },
    endDate: {
        type: Date,
        required: [true, 'Please specify an end date for the announcement']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    facultyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    facultyName: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);
