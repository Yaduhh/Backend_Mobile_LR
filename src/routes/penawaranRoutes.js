const express = require('express');
const router = express.Router();
const penawaranController = require('../controllers/penawaranController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Get all penawaran for sales
router.get('/', penawaranController.index);

// Get clients by sales (must be before /:id routes)
router.get('/clients/sales', penawaranController.getClientsBySales);

// Get products
router.get('/products/pvc-pipa-standard-aw', penawaranController.getPvcPipaStandardAw);
router.get('/products/pvc-pipa-standard-d', penawaranController.getPvcPipaStandardD);

// Get syarat ketentuan
router.get('/syarat-ketentuan', penawaranController.getSyaratKetentuan);

// Get gudang
router.get('/gudang', penawaranController.getGudang);

// Get kop surat
router.get('/kop-surat', penawaranController.getKopSurat);

// Get single penawaran
router.get('/:id', penawaranController.show);

// Create new penawaran
router.post('/', penawaranController.store);

// Update penawaran
router.put('/:id', penawaranController.update);

// Delete penawaran
router.delete('/:id', penawaranController.destroy);

// Update status penawaran
router.patch('/:id/status', penawaranController.updateStatus);

module.exports = router; 