const express = require('express');
const router = express.Router();
const { getStudents, createStudent, updateStudent, deleteStudent, getMe, approveStudent } = require('../controllers/studentController');
const { protect, facultyOnly } = require('../middleware/authMiddleware');

router.get('/me', protect, getMe);

router.route('/')
    .get(protect, facultyOnly, getStudents)
    .post(protect, facultyOnly, createStudent);

router.route('/:id')
    .put(protect, facultyOnly, updateStudent)
    .delete(protect, facultyOnly, deleteStudent);

router.route('/:id/approve')
    .put(protect, facultyOnly, approveStudent);

module.exports = router;
