const SuccessStudent = require('../models/SuccessStudent');
const { uploadPhoto } = require('../utils/cloudinary');
const cloudinary = require('cloudinary').v2;

// @desc    Get all success student images
// @route   GET /api/success-students
// @access  Private (Students, Faculty, Admin)
exports.getSuccessStudents = async (req, res) => {
    try {
        const { onlyActive } = req.query;
        let filter = {};

        // If requested with onlyActive or caller is student, only return active ones
        if (onlyActive === 'true' || req.user.role === 'student') {
            filter.isActive = true;
        }

        const successStudents = await SuccessStudent.find(filter)
            .populate('facultyId', 'username email name')
            .sort({ createdAt: -1, _id: -1 });

        res.status(200).json(successStudents);
    } catch (error) {
        console.error('Error fetching success students:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Upload new success student images (Images only)
// @route   POST /api/success-students
// @access  Private (Faculty, Admin)
exports.uploadSuccessStudents = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'Please select at least one image to upload' });
        }

        const facultyName = req.user.username || req.user.name || req.user.email || 'Faculty';
        const createdEntries = [];
        let lastError = null;

        for (const file of req.files) {
            try {
                const cleanName = file.originalname ? file.originalname.replace(/\.[^/.]+$/, "") : 'success_student';
                const uploadRes = await uploadPhoto(
                    file.buffer,
                    'workbook/success_students',
                    cleanName
                );

                const newEntry = await SuccessStudent.create({
                    imageUrl: uploadRes.secure_url,
                    public_id: uploadRes.public_id,
                    originalName: file.originalname || 'student_poster',
                    isActive: true,
                    facultyId: req.user._id || req.user.id,
                    facultyName
                });

                createdEntries.push(newEntry);
            } catch (uploadErr) {
                console.error('Error uploading image to Cloudinary:', uploadErr);
                lastError = uploadErr;
            }
        }

        if (createdEntries.length === 0) {
            return res.status(500).json({ 
                message: lastError?.message || 'Failed to upload images. Please check the files and try again.' 
            });
        }

        res.status(201).json(createdEntries);
    } catch (error) {
        console.error('Error in uploadSuccessStudents:', error);
        res.status(500).json({ message: error.message || 'Server error', error: error.message });
    }
};

// @desc    Toggle or set active status of a success student image
// @route   PATCH /api/success-students/:id/toggle
// @access  Private (Faculty, Admin)
exports.toggleSuccessStudentStatus = async (req, res) => {
    try {
        const item = await SuccessStudent.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Success student image not found' });
        }

        if (typeof req.body.isActive === 'boolean') {
            item.isActive = req.body.isActive;
        } else {
            item.isActive = !item.isActive;
        }

        await item.save();

        res.status(200).json(item);
    } catch (error) {
        console.error('Error toggling success student status:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// @desc    Delete a success student image
// @route   DELETE /api/success-students/:id
// @access  Private (Faculty, Admin)
exports.deleteSuccessStudent = async (req, res) => {
    try {
        const item = await SuccessStudent.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: 'Success student image not found' });
        }

        // Delete from Cloudinary if public_id is available
        if (item.public_id) {
            try {
                await cloudinary.uploader.destroy(item.public_id);
            } catch (delErr) {
                console.warn('Could not delete image from Cloudinary:', item.public_id, delErr.message);
            }
        }

        await SuccessStudent.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Success student image deleted successfully' });
    } catch (error) {
        console.error('Error deleting success student image:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
