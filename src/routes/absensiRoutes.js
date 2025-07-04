const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const absensiController = require('../controllers/absensiController');

// Apply auth middleware to all routes
router.use(auth);

// Get today's attendance
router.get('/today', absensiController.getTodayAbsensi);

// Get attendance history
router.get('/history', absensiController.getAbsensiHistory);

// Create new attendance
router.post('/', absensiController.createAbsensi);

// Update attendance
router.put('/:id', absensiController.updateAbsensi);

// Delete attendance
router.delete('/:id', absensiController.deleteAbsensi);

module.exports = router; 