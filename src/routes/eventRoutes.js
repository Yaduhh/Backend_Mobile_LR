const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { auth } = require('../middleware/auth');

// Get all events (for admin)
router.get('/', auth, eventController.getAllEvents);

// Get upcoming events (all active upcoming events)
router.get('/upcoming', auth, eventController.getUpcomingEvents);

// Get my upcoming events (where I'm invited)
router.get('/my-upcoming', auth, eventController.getMyUpcomingEvents);

// Get past events
router.get('/past', auth, eventController.getPastEvents);

// Get dashboard data for sales
router.get('/dashboard', auth, eventController.getDashboard);

// Create new event (only for admin/creator)
router.post('/', auth, eventController.createEvent);

// Update event (only for creator)
router.put('/:id', auth, eventController.updateEvent);

// Delete event (only for creator)
router.delete('/:id', auth, eventController.deleteEvent);

// Get event by ID (with permission check) - harus di akhir agar tidak mengganggu route lain
router.get('/:id', auth, eventController.getEventById);

module.exports = router; 