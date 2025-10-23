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

// Get all product categories (route for fetching all at once)
router.get('/products/categories', penawaranController.getAllProductCategories);

// Get products by brand (18 endpoints)
// BLACK HDPE
router.get('/products/black-hdpe-pipa', penawaranController.getBlackHdpePipa);
router.get('/products/black-hdpe-fitting', penawaranController.getBlackHdpeFitting);
// EXOPLAS
router.get('/products/exoplas-pipa', penawaranController.getExoplasPipa);
router.get('/products/exoplas-fitting', penawaranController.getExoplasFitting);
// KELOX
router.get('/products/kelox-pipa', penawaranController.getKeloxPipa);
router.get('/products/kelox-fitting', penawaranController.getKeloxFitting);
// LITE
router.get('/products/lite-pipa', penawaranController.getLitePipa);
router.get('/products/lite-fitting', penawaranController.getLiteFitting);
// SAFE & LOK
router.get('/products/safelok-pipa', penawaranController.getSafelokPipa);
router.get('/products/safelok-fitting', penawaranController.getSafelokFitting);
// ONDA
router.get('/products/onda-pipa', penawaranController.getOndaPipa);
router.get('/products/onda-fitting', penawaranController.getOndaFitting);
// PPR
router.get('/products/ppr-pipa', penawaranController.getPprPipa);
router.get('/products/ppr-fitting', penawaranController.getPprFitting);
// PIPA STANDARD
router.get('/products/pipa-standard-pipa', penawaranController.getPipaStandardPipa);
router.get('/products/pipa-standard-fitting', penawaranController.getPipaStandardFitting);

// Legacy routes (keep for backward compatibility)
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