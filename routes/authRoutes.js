const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLogin, googleRegister, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/google/register', googleRegister);
router.get('/profile', protect, getProfile);

module.exports = router;
