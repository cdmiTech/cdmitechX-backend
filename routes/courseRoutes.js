const express = require('express');
const router = express.Router();
const { getCourses, createCourse, updateCourse, deleteCourse } = require('../controllers/courseController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');

router.route('/')
    .get(getCourses)
    .post(protect, facultyOnly, createCourse);

router.route('/:id')
    .put(protect, facultyOnly, updateCourse)
    .delete(protect, facultyOnly, deleteCourse);

module.exports = router;
