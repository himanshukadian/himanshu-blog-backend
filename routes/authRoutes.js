const express = require('express');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.patch('/reset-password/:token', authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);

// Protected routes
router.use(protect);
router.patch('/update-password', authController.updatePassword);
router.patch('/update-me', authController.updateMe);
router.delete('/delete-me', authController.deleteMe);
router.get('/me', authController.getMe);

module.exports = router; 