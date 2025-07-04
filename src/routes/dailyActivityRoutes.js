const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { DailyActivityController, upload } = require('../controllers/dailyActivityController');
const multer = require('multer');

// Apply auth middleware to all routes
router.use(auth);

// Error handling for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File terlalu besar. Maksimal 10MB per file.'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Terlalu banyak file. Maksimal 10 file.'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Field file tidak sesuai.'
      });
    }
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Error pada upload file.'
    });
  }
  next();
};

// Daily activity routes
router.get('/', DailyActivityController.getAllDailyActivities);
router.get('/:id', DailyActivityController.getDailyActivityById);
router.post('/', upload.array('dokumentasi', 10), handleMulterError, DailyActivityController.createDailyActivity);
router.put('/:id', upload.array('dokumentasi', 10), handleMulterError, DailyActivityController.updateDailyActivity);
router.delete('/:id', DailyActivityController.deleteDailyActivity);
// Tambahkan endpoint baru untuk komentar
router.post('/:id/komentar', DailyActivityController.addComment);

module.exports = router;