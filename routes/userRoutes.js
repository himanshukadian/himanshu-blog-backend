const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const permit = require('../middleware/permission');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateMe,
  deleteMe
} = require('../controllers/userController');

// Public routes
router.post('/signup', createUser);

// Protected routes
router.use(protect);

// User routes
router.get('/me', getMe);
router.patch('/me', updateMe);
router.delete('/me', deleteMe);

// Admin only routes
router.get('/', permit('admin'), getAllUsers);
router.get('/:id', permit('admin'), getUserById);
router.patch('/:id', permit('admin'), updateUser);
router.delete('/:id', permit('admin'), deleteUser);

module.exports = router; 