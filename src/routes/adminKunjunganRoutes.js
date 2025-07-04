const express = require('express');
const router = express.Router();
const { AdminKunjunganController } = require('../controllers/adminKunjunganController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// GET /api/admin/kunjungan
router.get('/', AdminKunjunganController.getAllKunjungan);

// GET /api/admin/kunjungan/sales
router.get('/sales', AdminKunjunganController.getAllSales);

// GET /api/admin/kunjungan/stats/overview
router.get('/stats/overview', AdminKunjunganController.getKunjunganStats);

// GET /api/admin/kunjungan/:id
router.get('/:id', AdminKunjunganController.getKunjunganById);

// GET /api/admin/kunjungan/client/:clientId
router.get('/client/:clientId', AdminKunjunganController.getKunjunganByClientId);

// POST /api/admin/kunjungan/:id/komentar
router.post('/:id/komentar', AdminKunjunganController.addComment);

module.exports = router; 