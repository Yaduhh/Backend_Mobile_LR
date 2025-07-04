const db = require('../config/database');

const eventController = {
  // Get all events
  getAllEvents: async (req, res) => {
    try {
      const query = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0
        ORDER BY e.jadwal DESC
      `;
      
      const [results] = await db.execute(query);
      
      // Parse peserta array for each event
      const events = results.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Error in getAllEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Get upcoming events (all active upcoming events)
  getUpcomingEvents: async (req, res) => {
    try {
      const query = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
        AND e.jadwal > NOW()
        AND e.status = 'active'
        ORDER BY e.jadwal ASC
      `;
      
      const [results] = await db.execute(query);
      
      const events = results.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Error in getUpcomingEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Get my upcoming events (where I'm invited)
  getMyUpcomingEvents: async (req, res) => {
    try {
      const userId = req.user.id;
      
      const query = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
        AND e.jadwal > NOW()
        AND e.status = 'active'
        ORDER BY e.jadwal ASC
      `;
      
      const [results] = await db.execute(query);
      
      // Filter events where user is invited
      const events = results
        .map(event => ({
          ...event,
          peserta: event.peserta ? JSON.parse(event.peserta) : []
        }))
        .filter(event => event.peserta.includes(userId.toString()) || event.peserta.includes(userId));

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Error in getMyUpcomingEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Get past events
  getPastEvents: async (req, res) => {
    try {
      const query = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
        AND e.jadwal < NOW()
        ORDER BY e.jadwal DESC
      `;
      
      const [results] = await db.execute(query);
      
      const events = results.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error('Error in getPastEvents:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Get event by ID (with permission check)
  getEventById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      console.log('Getting event with ID:', id);
      console.log('User ID:', userId);
      
      const query = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.id = ? AND e.status_deleted = 0
      `;
      
      const [results] = await db.execute(query, [id]);
      
      if (results.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }

      const event = {
        ...results[0],
        peserta: results[0].peserta ? JSON.parse(results[0].peserta) : []
      };

      console.log('Event peserta:', event.peserta);

      // Get invited users details
      if (event.peserta.length > 0) {
        // Convert string IDs to integers for the query
        const participantIds = event.peserta.map(id => parseInt(id));
        console.log('Participant IDs:', participantIds);
        
        const invitedUsersQuery = `
          SELECT id, name, email
          FROM users 
          WHERE id IN (${participantIds.map(() => '?').join(',')})
          AND status_deleted = 0
        `;
        
        console.log('Query:', invitedUsersQuery);
        console.log('Query params:', participantIds);
        
        const [invitedUsers] = await db.execute(invitedUsersQuery, participantIds);
        console.log('Invited users result:', invitedUsers);
        
        event.invitedUsers = invitedUsers;
      } else {
        event.invitedUsers = [];
      }

      // Add user participation status - convert userId to string for comparison
      event.isUserInvited = event.peserta.includes(userId.toString()) || event.peserta.includes(userId);
      event.isUserCreator = event.created_by === userId;

      console.log('Final event data:', {
        id: event.id,
        nama_event: event.nama_event,
        peserta_count: event.peserta.length,
        invitedUsers_count: event.invitedUsers.length,
        isUserInvited: event.isUserInvited,
        isUserCreator: event.isUserCreator
      });

      res.json({
        success: true,
        data: event
      });
    } catch (error) {
      console.error('Error in getEventById:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Get dashboard data for sales
  getDashboard: async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Get upcoming events (limit 5)
      const upcomingQuery = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
        AND e.jadwal > NOW()
        AND e.status = 'active'
        ORDER BY e.jadwal ASC
        LIMIT 5
      `;
      
      // Get recent past events (limit 5)
      const pastQuery = `
        SELECT 
          e.*,
          u.name as creator_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
        AND e.jadwal < NOW()
        ORDER BY e.jadwal DESC
        LIMIT 5
      `;
      
      const [upcomingResults] = await db.execute(upcomingQuery);
      const [pastResults] = await db.execute(pastQuery);
      
      const upcomingEvents = upcomingResults.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));
      
      const pastEvents = pastResults.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));

      // Filter my upcoming events (where I'm invited)
      const myUpcomingEvents = upcomingEvents
        .filter(event => event.peserta.includes(userId.toString()) || event.peserta.includes(userId))
        .slice(0, 3);

      res.json({
        success: true,
        data: {
          upcomingEvents,
          pastEvents,
          myUpcomingEvents
        }
      });
    } catch (error) {
      console.error('Error in getDashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Create new event (only for admin/creator)
  createEvent: async (req, res) => {
    try {
      const { nama_event, jadwal, location, deskripsi, peserta, status } = req.body;
      const created_by = req.user.id;

      const query = `
        INSERT INTO events (nama_event, jadwal, location, deskripsi, peserta, created_by, status, status_deleted)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
      `;

      const pesertaJson = JSON.stringify(peserta || []);

      const [results] = await db.execute(query, [nama_event, jadwal, location, deskripsi, pesertaJson, created_by, status || 'active']);

      res.status(201).json({
        success: true,
        message: 'Event berhasil dibuat',
        data: { id: results.insertId }
      });
    } catch (error) {
      console.error('Error in createEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Update event (only for creator)
  updateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const { nama_event, jadwal, location, deskripsi, peserta, status } = req.body;
      const userId = req.user.id;

      // Check if user is the creator of this event
      const checkQuery = `SELECT created_by FROM events WHERE id = ? AND status_deleted = 0`;
      const [checkResults] = await db.execute(checkQuery, [id]);
      
      if (checkResults.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }

      if (checkResults[0].created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk mengedit event ini'
        });
      }

      const query = `
        UPDATE events 
        SET nama_event = ?, jadwal = ?, location = ?, deskripsi = ?, peserta = ?, status = ?
        WHERE id = ? AND status_deleted = 0
      `;

      const pesertaJson = JSON.stringify(peserta || []);

      const [results] = await db.execute(query, [nama_event, jadwal, location, deskripsi, pesertaJson, status, id]);

      res.json({
        success: true,
        message: 'Event berhasil diupdate'
      });
    } catch (error) {
      console.error('Error in updateEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Delete event (only for creator)
  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if user is the creator of the event
      const checkQuery = `
        SELECT created_by FROM events 
        WHERE id = ? AND status_deleted = 0
      `;
      
      const [checkResult] = await db.execute(checkQuery, [id]);
      
      if (checkResult.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }

      if (checkResult[0].created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki izin untuk menghapus event ini'
        });
      }

      const query = `
        UPDATE events 
        SET status_deleted = 1
        WHERE id = ? AND status_deleted = 0
      `;

      await db.execute(query, [id]);

      res.json({
        success: true,
        message: 'Event berhasil dihapus'
      });
    } catch (error) {
      console.error('Error in deleteEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }
};

module.exports = eventController; 