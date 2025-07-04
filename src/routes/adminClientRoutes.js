const express = require('express');
const router = express.Router();
const adminClientController = require('../controllers/adminClientController');
const { auth } = require('../middleware/auth');

// Middleware untuk memastikan user adalah admin
const adminAuth = (req, res, next) => {
  console.log('=== ADMIN AUTH DEBUG ===');
  console.log('req.user:', req.user);
  console.log('req.user.role:', req.user?.role);
  console.log('req.user.role type:', typeof req.user?.role);
  console.log('req.user.role === 1:', req.user?.role === 1);
  console.log('========================');
  
  if (req.user && req.user.role === 1) {
    console.log('✅ Admin auth berhasil');
    next();
  } else {
    console.log('❌ Admin auth gagal');
    res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin yang dapat mengakses endpoint ini.' });
  }
};

// Apply auth middleware to all routes
router.use(auth);
router.use(adminAuth);

// Get all clients (admin can see all clients from all sales)
router.get('/', adminClientController.getAllClients);

// Search clients (harus sebelum /:id)
router.get('/search', adminClientController.searchClients);

// Get deleted clients (harus sebelum /:id)
router.get('/deleted/all', adminClientController.getDeletedClients);

// Get client statistics (harus sebelum /:id)
router.get('/stats/overview', adminClientController.getClientStats);

// Get clients by sales ID (harus sebelum /:id)
router.get('/sales/:salesId', adminClientController.getClientsBySales);

// Create new client
router.post('/', adminClientController.createClient);

// Get client by ID
router.get('/:id', adminClientController.getClientById);

// Update client
router.put('/:id', adminClientController.updateClient);

// Delete client (soft delete)
router.delete('/:id', adminClientController.deleteClient);

// Restore client (harus setelah /:id)
router.put('/:id/restore', adminClientController.restoreClient);

module.exports = router; 