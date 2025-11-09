const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrderController');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'upload/purchase-input-files/');
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: function (req, file, cb) {
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Apply auth middleware to all routes
router.use(auth);

// Purchase Order routes
router.get('/', purchaseOrderController.index);
router.get('/:id', purchaseOrderController.show);
router.post('/', upload.array('purchase_files[]', 10), purchaseOrderController.store);
router.put('/:id', purchaseOrderController.update);
router.delete('/:id', purchaseOrderController.destroy);

// Purchase Order action routes
router.post('/:id/approve', purchaseOrderController.approve);
router.post('/:id/start-production', purchaseOrderController.startProduction);
router.post('/:id/complete-production', purchaseOrderController.completeProduction);
router.post('/:id/cancel', purchaseOrderController.cancel);
router.post('/:id/reactivate', purchaseOrderController.reactivate);

// File routes
router.delete('/file/:fileId', purchaseOrderController.deleteFile);

module.exports = router;