const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLogin, googleRegister, getProfile, checkEmail } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleLogin);
router.post('/google/register', googleRegister);
router.post('/check-email', checkEmail);
router.get('/profile', protect, getProfile);

module.exports = router;
