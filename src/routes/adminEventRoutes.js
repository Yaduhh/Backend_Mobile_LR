const express = require('express');
const router = express.Router();
const adminEventController = require('../controllers/adminEventController');
const { auth } = require('../middleware/auth');

console.log('=== Admin Event Routes Loading ===');

// Apply auth middleware to all routes
router.use(auth);

// ===== ADMIN EVENT ROUTES =====

// Get all events for admin
router.get('/', (req, res, next) => {
  console.log('Route hit: GET / (getAllEvents)');
  next();
}, adminEventController.getAllEvents);

// Get upcoming events
router.get('/upcoming', (req, res, next) => {
  console.log('Route hit: GET /upcoming (getUpcomingEvents)');
  next();
}, adminEventController.getUpcomingEvents);

// Get past events
router.get('/past', (req, res, next) => {
  console.log('Route hit: GET /past (getPastEvents)');
  next();
}, adminEventController.getPastEvents);

// Get event statistics
router.get('/stats', (req, res, next) => {
  console.log('Route hit: GET /stats (getStats)');
  next();
}, adminEventController.getStats);

// Get all users for participant selection
router.get('/users', (req, res, next) => {
  console.log('Route hit: GET /users (getAllUsers)');
  next();
}, adminEventController.getAllUsers);

// Create new event
router.post('/', (req, res, next) => {
  console.log('Route hit: POST / (createEvent)');
  next();
}, adminEventController.createEvent);

// Get event by ID (harus di bawah route spesifik)
router.get('/:id', (req, res, next) => {
  console.log('Route hit: GET /:id (getEventById)', req.params.id);
  next();
}, adminEventController.getEventById);

// Update event
router.put('/:id', (req, res, next) => {
  console.log('Route hit: PUT /:id (updateEvent)', req.params.id);
  next();
}, adminEventController.updateEvent);

// Update event status
router.put('/:id/status', (req, res, next) => {
  console.log('Route hit: PUT /:id/status (updateStatus)', req.params.id);
  next();
}, adminEventController.updateStatus);

// Delete event
router.delete('/:id', (req, res, next) => {
  console.log('Route hit: DELETE /:id (deleteEvent)', req.params.id);
  next();
}, adminEventController.deleteEvent);

console.log('=== Admin Event Routes Loaded ===');

module.exports = router; 