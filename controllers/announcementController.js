const Announcement = require('../models/Announcement');
const { uploadPhoto } = require('../utils/cloudinary');
const cloudinary = require('cloudinary').v2;

// @desc    Get all announcements
// @route   GET /api/announcements
// @access  Private (Students, Faculty, Admin)
exports.getAnnouncements = async (req, res) => {
    try {
        const { onlyActive } = req.query;
        let filter = {};

        // If onlyActive is true, filter active and end date >= today's start of day
        if (onlyActive === 'true') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filter = {
                isActive: true,
                endDate: { $gte: today }
            };
        }

        // Descending order by createdAt
        const announcements = await Announcement.find(filter)
            .populate('facultyId', 'username email name')
            .sort({ createdAt: -1 });

        res.status(200).json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Get single announcement by ID
// @route   GET /api/announcements/:id
// @access  Private (Students, Faculty, Admin)
exports.getAnnouncementById = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id)
            .populate('facultyId', 'username email name');

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        res.status(200).json(announcement);
    } catch (error) {
        console.error('Error fetching announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Create new announcement
// @route   POST /api/announcements
// @access  Private (Faculty, Admin)
exports.createAnnouncement = async (req, res) => {
    try {
        const { title, description, link, linkButtonText, endDate, isActive } = req.body;

        if (!title || !endDate) {
            return res.status(400).json({ message: 'Title and End Date are required' });
        }

        let uploadedImages = [];

        // Parse any existing or pre-uploaded images passed in body
        if (req.body.existingImages) {
            try {
                const parsed = typeof req.body.existingImages === 'string'
                    ? JSON.parse(req.body.existingImages)
                    : req.body.existingImages;
                if (Array.isArray(parsed)) {
                    uploadedImages.push(...parsed);
                }
            } catch (e) {
                console.warn('Error parsing existingImages:', e.message);
            }
        }

        // Process newly uploaded files
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await uploadPhoto(
                        file.buffer,
                        'workbook/announcements',
                        file.originalname ? file.originalname.replace(/\.[^/.]+$/, "") : 'announcement'
                    );
                    uploadedImages.push({
                        url: result.secure_url,
                        public_id: result.public_id,
                        name: file.originalname || 'announcement_image'
                    });
                } catch (uploadErr) {
                    console.error('Error uploading image to Cloudinary:', uploadErr);
                    // continue with other images if one fails
                }
            }
        }

        const facultyName = req.user.username || req.user.name || req.user.email || 'Faculty';

        const announcement = await Announcement.create({
            title: title.trim(),
            description: description ? description.trim() : '',
            images: uploadedImages,
            link: link ? link.trim() : '',
            linkButtonText: linkButtonText ? linkButtonText.trim() : 'Learn More',
            endDate: new Date(endDate),
            isActive: isActive !== undefined ? (isActive === 'true' || isActive === true) : true,
            facultyId: req.user._id || req.user.id,
            facultyName
        });

        res.status(201).json(announcement);
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Update announcement
// @route   PUT /api/announcements/:id
// @access  Private (Faculty, Admin)
exports.updateAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        const { title, description, link, linkButtonText, endDate, isActive } = req.body;

        if (title !== undefined) announcement.title = title.trim();
        if (description !== undefined) announcement.description = description.trim();
        if (link !== undefined) announcement.link = link.trim();
        if (linkButtonText !== undefined) announcement.linkButtonText = linkButtonText.trim();
        if (endDate !== undefined) announcement.endDate = new Date(endDate);
        if (isActive !== undefined) announcement.isActive = isActive === 'true' || isActive === true;

        // Handle existing images kept by the user
        let currentImages = [];
        if (req.body.existingImages !== undefined) {
            try {
                const parsed = typeof req.body.existingImages === 'string'
                    ? JSON.parse(req.body.existingImages)
                    : req.body.existingImages;
                if (Array.isArray(parsed)) {
                    currentImages = parsed;
                }
            } catch (e) {
                console.warn('Error parsing existingImages in update:', e.message);
            }
        } else {
            currentImages = announcement.images || [];
        }

        // Determine deleted images and clean them up from Cloudinary
        const retainedPublicIds = new Set(currentImages.map(img => img.public_id).filter(Boolean));
        const removedImages = (announcement.images || []).filter(img => img.public_id && !retainedPublicIds.has(img.public_id));
        for (const remImg of removedImages) {
            try {
                await cloudinary.uploader.destroy(remImg.public_id);
            } catch (delErr) {
                console.warn('Failed to delete image from Cloudinary:', remImg.public_id, delErr.message);
            }
        }

        // Process newly uploaded files
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const result = await uploadPhoto(
                        file.buffer,
                        'workbook/announcements',
                        file.originalname ? file.originalname.replace(/\.[^/.]+$/, "") : 'announcement'
                    );
                    currentImages.push({
                        url: result.secure_url,
                        public_id: result.public_id,
                        name: file.originalname || 'announcement_image'
                    });
                } catch (uploadErr) {
                    console.error('Error uploading image to Cloudinary during update:', uploadErr);
                }
            }
        }

        announcement.images = currentImages;
        await announcement.save();

        res.status(200).json(announcement);
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete announcement
// @route   DELETE /api/announcements/:id
// @access  Private (Faculty, Admin)
exports.deleteAnnouncement = async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);

        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found' });
        }

        // Delete associated images from Cloudinary
        if (announcement.images && announcement.images.length > 0) {
            for (const img of announcement.images) {
                if (img.public_id) {
                    try {
                        await cloudinary.uploader.destroy(img.public_id);
                    } catch (delErr) {
                        console.warn('Could not delete image from Cloudinary:', img.public_id, delErr.message);
                    }
                }
            }
        }

        await Announcement.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Announcement deleted successfully' });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
