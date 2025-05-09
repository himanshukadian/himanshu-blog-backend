const express = require('express');
const router = express.Router();
const tagController = require('../controllers/tagController');
const { auth, permit } = require('../middleware/auth');

router.get('/', tagController.getTags);
router.post('/', auth, permit('admin', 'editor'), tagController.createTag);
router.put('/:id', auth, permit('admin', 'editor'), tagController.updateTag);
router.delete('/:id', auth, permit('admin'), tagController.deleteTag);

module.exports = router; 