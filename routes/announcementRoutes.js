const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    getAnnouncements,
    getAnnouncementById,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement
} = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Multer storage in memory
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB per image
});

// All announcement routes require authentication
router.use(protect);

// Publicly readable by all authenticated users (students, faculty, admin)
router.get('/', getAnnouncements);
router.get('/:id', getAnnouncementById);

// Write operations restricted to faculty and admin
router.post('/', authorize('faculty', 'admin'), upload.array('images', 10), createAnnouncement);
router.put('/:id', authorize('faculty', 'admin'), upload.array('images', 10), updateAnnouncement);
router.delete('/:id', authorize('faculty', 'admin'), deleteAnnouncement);

module.exports = router;
