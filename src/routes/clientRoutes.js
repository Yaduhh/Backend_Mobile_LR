const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const clientController = require('../controllers/clientController');

// Apply auth middleware to all routes
router.use(auth);

// Client routes
router.get('/', clientController.getAllClients);
router.get('/:id', clientController.getClientById);
router.post('/', clientController.createClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router; 