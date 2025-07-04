const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'upload/profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'TAPCP' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Middleware untuk memastikan user adalah admin
const adminAuth = (req, res, next) => {
  if (req.user && req.user.role === 1) {
    next();
  } else {
    res.status(403).json({ 
      status: 'error', 
      message: 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.' 
    });
  }
};

// Public routes
router.post('/login', AuthController.login);
router.post('/register', AuthController.register);

// Protected routes
router.get('/profile', auth, AuthController.getProfile);
router.post('/change-password', auth, AuthController.changePassword);
router.post('/update-profile', auth, AuthController.updateProfile);
router.post('/upload-profile', auth, upload.single('profile'), AuthController.uploadProfile);

// Admin-only routes
router.get('/admin/profile', auth, adminAuth, AuthController.getProfile);
router.post('/admin/change-password', auth, adminAuth, AuthController.changePassword);
router.post('/admin/update-profile', auth, adminAuth, AuthController.updateProfile);
router.post('/admin/upload-profile', auth, adminAuth, upload.single('profile'), AuthController.uploadProfile);

module.exports = router; 