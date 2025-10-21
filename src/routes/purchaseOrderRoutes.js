const express = require('express');
const router = express.Router();
const PurchaseOrderController = require('../controllers/purchaseOrderController');
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Create Purchase Order
router.post('/', PurchaseOrderController.create);

// Get Purchase Order Stats
router.get('/stats', PurchaseOrderController.getStats);

// Get Purchase Orders (with filters)
router.get('/', PurchaseOrderController.index);

// Get Purchase Order by ID
router.get('/:id', PurchaseOrderController.show);

// Update Purchase Order
router.put('/:id', PurchaseOrderController.update);

// Delete Purchase Order
router.delete('/:id', PurchaseOrderController.destroy);

// Approve Purchase Order
router.post('/:id/approve', PurchaseOrderController.approve);

// Start Production
router.post('/:id/start-production', PurchaseOrderController.startProduction);

// Complete Production
router.post('/:id/complete-production', PurchaseOrderController.completeProduction);

// Cancel Purchase Order
router.post('/:id/cancel', PurchaseOrderController.cancel);

// Reactivate Purchase Order
router.post('/:id/reactivate', PurchaseOrderController.reactivate);

// Get PO Items
router.get('/:id/items', PurchaseOrderController.getItems);

// Update PO Item Status
router.put('/:id/items/:itemId/status', PurchaseOrderController.updateItemStatus);

module.exports = router; 