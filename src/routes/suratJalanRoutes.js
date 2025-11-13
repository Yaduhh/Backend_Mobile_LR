const express = require('express');
const router = express.Router();
const suratJalanController = require('../controllers/suratJalanController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Surat Jalan routes
router.get('/', suratJalanController.index);
router.get('/:id', suratJalanController.show);

module.exports = router;
