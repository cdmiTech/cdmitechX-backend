const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getSuccessStudents,
    uploadSuccessStudents,
    toggleSuccessStudentStatus,
    deleteSuccessStudent
} = require('../controllers/successStudentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max per image
});

// All routes require authentication
router.use(protect);

// Accessible by students, faculty, and admin (students receive only active)
router.get('/', getSuccessStudents);

// Safe upload wrapper that catches multer errors cleanly
const uploadMiddleware = (req, res, next) => {
    upload.array('images', 30)(req, res, (err) => {
        if (err) {
            console.error('Multer file upload error:', err);
            return res.status(400).json({ message: err.message || 'File upload error' });
        }
        next();
    });
};

// Faculty & Admin management routes
router.post('/', authorize('faculty', 'admin'), uploadMiddleware, uploadSuccessStudents);
router.patch('/:id/toggle', authorize('faculty', 'admin'), toggleSuccessStudentStatus);
router.delete('/:id', authorize('faculty', 'admin'), deleteSuccessStudent);

module.exports = router;
