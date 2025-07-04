const express = require('express');
const router = express.Router();
const adminArsipFileController = require('../controllers/adminArsipFileController');
const { adminAuth } = require('../middleware/auth');

// Apply admin auth middleware to all routes
router.use(adminAuth);

// Admin arsip file routes
router.get('/', adminArsipFileController.getAllArsipFiles);
router.post('/', adminArsipFileController.createArsipFile);
router.delete('/:id', adminArsipFileController.deleteArsipFile);

module.exports = router; 