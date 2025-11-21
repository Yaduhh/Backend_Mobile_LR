const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const gudangPurchaseOrderController = require('../controllers/gudangPurchaseOrderController');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const ensureDirExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const suratJalanId = req.params.id || 'general';
    const uploadDir = path.join(
      process.cwd(),
      'upload',
      'dokumentasi',
      'surat-jalan',
      String(suratJalanId)
    );
    ensureDirExists(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitized = (file.originalname || 'dokumentasi').replace(
      /[^a-zA-Z0-9._-]/g,
      '_'
    );
    cb(null, `${uniqueSuffix}-${sanitized}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak diizinkan untuk dokumentasi.'));
    }
  }
});

const dokumentasiUploadMiddleware = (req, res, next) => {
  upload.array('bukti_pengiriman[]', 10)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'Gagal mengunggah dokumentasi.'
      });
    }
    next();
  });
};

// Test route tanpa auth untuk debugging
router.get('/test-surat-jalan', (req, res) => {
  console.log('[Route] GET /api/gudang/purchase-orders/test-surat-jalan called');
  res.json({ success: true, message: 'Test route works!' });
});

router.use(auth);

// Route surat-jalan harus diletakkan PALING ATAS sebelum route lain agar tidak ter-match sebagai parameter
router.get('/surat-jalan', async (req, res) => {
  try {
    console.log('[Route] GET /api/gudang/purchase-orders/surat-jalan called');
    console.log('[Route] Request method:', req.method);
    console.log('[Route] Request path:', req.path);
    console.log('[Route] Request originalUrl:', req.originalUrl);
    console.log('[Route] Request query:', req.query);
    console.log('[Route] User from auth:', req.user?.id);
    
    if (!gudangPurchaseOrderController.getSuratJalanList) {
      console.error('[Route] ERROR: getSuratJalanList method not found in controller!');
      return res.status(500).json({
        success: false,
        message: 'Controller method not found'
      });
    }
    
    await gudangPurchaseOrderController.getSuratJalanList(req, res);
  } catch (error) {
    console.error('[Route] Error in surat-jalan route:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
});
router.get('/surat-jalan/:id', (req, res) => {
  console.log('[Route] GET /api/gudang/purchase-orders/surat-jalan/:id called', req.params.id);
  gudangPurchaseOrderController.getSuratJalanDetail(req, res);
});
router.post(
  '/surat-jalan/:id/upload-dokumentasi',
  dokumentasiUploadMiddleware,
  (req, res) => gudangPurchaseOrderController.uploadSuratJalanDokumentasi(req, res)
);

router.post('/items/:itemId/progress', (req, res) =>
  gudangPurchaseOrderController.updateItemProgress(req, res)
);
router.post('/items/:itemId/transfer', (req, res) =>
  gudangPurchaseOrderController.transferProgress(req, res)
);

router.post('/:id/approve', (req, res) =>
  gudangPurchaseOrderController.approve(req, res)
);
router.post('/:id/start-production', (req, res) =>
  gudangPurchaseOrderController.startProduction(req, res)
);
router.post('/:id/complete', (req, res) =>
  gudangPurchaseOrderController.completeProduction(req, res)
);
router.post('/:id/cancel', (req, res) =>
  gudangPurchaseOrderController.cancel(req, res)
);
router.post('/:id/reactivate', (req, res) =>
  gudangPurchaseOrderController.reactivate(req, res)
);
router.post('/:id/close', (req, res) =>
  gudangPurchaseOrderController.close(req, res)
);
router.post('/:id/surat-jalan', (req, res) =>
  gudangPurchaseOrderController.createSuratJalan(req, res)
);

router.get('/:id', (req, res) =>
  gudangPurchaseOrderController.detail(req, res)
);

module.exports = router;

