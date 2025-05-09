const express = require('express');
const router = express.Router();
const typeController = require('../controllers/typeController');
const { auth, permit } = require('../middleware/auth');

router.get('/', typeController.getTypes);
router.post('/', auth, permit('admin', 'editor'), typeController.createType);
router.put('/:id', auth, permit('admin', 'editor'), typeController.updateType);
router.delete('/:id', auth, permit('admin'), typeController.deleteType);

module.exports = router; 