const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, permit } = require('../middleware/auth');

router.get('/', auth, permit('admin'), userController.getUsers);
router.post('/', auth, permit('admin'), userController.createUser);
router.put('/:id', auth, permit('admin'), userController.updateUser);
router.delete('/:id', auth, permit('admin'), userController.deleteUser);

module.exports = router; 