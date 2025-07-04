const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const arsipFileController = require('../controllers/arsipFileController');

// Apply auth middleware to all routes
router.use(auth);

// Arsip file routes
router.get('/', arsipFileController.getAllArsipFiles);
router.post('/', arsipFileController.createArsipFile);
router.delete('/:id', arsipFileController.deleteArsipFile);

module.exports = router; 