const express = require('express');
const router = express.Router();
const { getFaculties, addFaculty, deleteFaculty } = require('../controllers/facultyController');
const { protect } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized as admin' });
    }
};

router.route('/')
    .get(getFaculties)
    .post(protect, addFaculty);

router.route('/:id')
    .delete(protect, deleteFaculty);

module.exports = router;
