const express = require('express');
const router = express.Router();
const { getLanguages, createLanguage, updateLanguage, deleteLanguage } = require('../controllers/languageController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, getLanguages)
    .post(protect, facultyOnly, createLanguage);

router.route('/:id')
    .put(protect, facultyOnly, updateLanguage)
    .delete(protect, facultyOnly, deleteLanguage);

module.exports = router;
