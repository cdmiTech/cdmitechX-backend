const express = require('express');
const router = express.Router();
const { getQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions } = require('../controllers/questionController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');
const multer = require('multer');

// Configure Multer storage
const storage = multer.memoryStorage();

// File filter to allow only jpg, jpeg, png
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only jpg, jpeg, and png files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: fileFilter
});

router.route('/')
    .get(protect, getQuestions)
    .post(protect, facultyOnly, upload.single('image'), createQuestion);

router.patch('/reorder', protect, facultyOnly, reorderQuestions);

router.route('/:id')
    .put(protect, facultyOnly, upload.single('image'), updateQuestion)
    .delete(protect, facultyOnly, deleteQuestion);

module.exports = router;
