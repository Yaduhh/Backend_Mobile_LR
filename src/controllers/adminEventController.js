const db = require('../config/database');

const adminEventController = {
  // Get all events for admin (with more details)
  getAllEvents: async (req, res) => {
    console.log('=== getAllEvents called ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    try {
      const query = `
        SELECT 
          e.*,
          u.name as creator_name,
          u.email as creator_email
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0
        ORDER BY e.jadwal DESC
      `;
      
      console.log('Executing query:', query);
      const [results] = await db.execute(query);
      console.log('Query results:', results.length, 'events found');
      
      // Parse peserta array for each event
      const events = results.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : [],
        total_participants: event.peserta ? JSON.parse(event.peserta).length : 0
      }));

      console.log('Sending response with', events.length, 'events');
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

  // Get upcoming events for admin
  getUpcomingEvents: async (req, res) => {
    console.log('=== getUpcomingEvents called ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    try {
      const query = `
        SELECT 
          e.*,
          u.name as creator_name,
          u.email as creator_email
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
          AND e.status = 'active' 
          AND e.jadwal > NOW()
        ORDER BY e.jadwal ASC
      `;
      
      console.log('Executing query:', query);
      const [results] = await db.execute(query);
      console.log('Query results:', results.length, 'upcoming events found');

      // Parse peserta JSON for each event
      const events = results.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));

      console.log('Sending response with', events.length, 'upcoming events');
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

  // Get past events for admin
  getPastEvents: async (req, res) => {
    console.log('=== getPastEvents called ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    try {
      const query = `
        SELECT 
          e.*,
          u.name as creator_name,
          u.email as creator_email
        FROM events e
        LEFT JOIN users u ON e.created_by = u.id
        WHERE e.status_deleted = 0 
          AND e.jadwal < NOW()
        ORDER BY e.jadwal DESC
      `;
      
      console.log('Executing query:', query);
      const [results] = await db.execute(query);
      console.log('Query results:', results.length, 'past events found');

      // Parse peserta JSON for each event
      const events = results.map(event => ({
        ...event,
        peserta: event.peserta ? JSON.parse(event.peserta) : []
      }));

      console.log('Sending response with', events.length, 'past events');
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

  // Get event statistics for admin dashboard
  getStats: async (req, res) => {
    console.log('=== getStats called ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    try {
      const queries = [
        // Total events
        `SELECT COUNT(*) as total FROM events WHERE status_deleted = 0`,
        // Active events
        `SELECT COUNT(*) as active FROM events WHERE status_deleted = 0 AND status = 'active'`,
        // Upcoming events
        `SELECT COUNT(*) as upcoming FROM events WHERE status_deleted = 0 AND status = 'active' AND jadwal > NOW()`,
        // Past events
        `SELECT COUNT(*) as past FROM events WHERE status_deleted = 0 AND jadwal < NOW()`,
        // Cancelled events
        `SELECT COUNT(*) as cancelled FROM events WHERE status_deleted = 0 AND status = 'cancelled'`,
        // Completed events
        `SELECT COUNT(*) as completed FROM events WHERE status_deleted = 0 AND status = 'completed'`
      ];

      console.log('Executing stats queries...');
      const results = await Promise.all(
        queries.map(query => db.execute(query))
      );

      const stats = {
        total: results[0][0][0].total,
        active: results[1][0][0].active,
        upcoming: results[2][0][0].upcoming,
        past: results[3][0][0].past,
        cancelled: results[4][0][0].cancelled,
        completed: results[5][0][0].completed
      };

      console.log('Stats calculated:', stats);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error in getStats:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Update event status (admin only)
  updateStatus: async (req, res) => {
    console.log('=== updateStatus called ===');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Params:', req.params);
    console.log('Body:', req.body);
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['active', 'cancelled', 'completed'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status tidak valid'
        });
      }

      const query = `
        UPDATE events 
        SET status = ?
        WHERE id = ? AND status_deleted = 0
      `;

      console.log('Executing update query:', query, 'with params:', [status, id]);
      const [result] = await db.execute(query, [status, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }

      console.log('Status updated successfully');
      res.json({
        success: true,
        message: 'Status event berhasil diperbarui'
      });
    } catch (error) {
      console.error('Error in updateStatus:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Create new event (admin only)
  createEvent: async (req, res) => {
    try {
      const { nama_event, deskripsi, location, jadwal, status, peserta } = req.body;
      const created_by = req.user.id;

      // Validation
      if (!nama_event || !deskripsi || !location || !jadwal || !peserta) {
        return res.status(400).json({
          success: false,
          message: 'Semua field harus diisi'
        });
      }

      // Convert peserta array to string array format ["1","2","3"]
      const pesertaStringArray = peserta.map(id => id.toString());

      // Get current time in WIB (+7 hours)
      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      const wibTimeString = wibTime.toISOString().slice(0, 19).replace('T', ' ');

      const query = `
        INSERT INTO events (nama_event, deskripsi, location, jadwal, status, peserta, created_by, status_deleted, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `;

      const pesertaJson = JSON.stringify(pesertaStringArray);
      
      const [result] = await db.execute(query, [
        nama_event,
        deskripsi,
        location,
        jadwal,
        status || 'active',
        pesertaJson,
        created_by,
        wibTimeString,
        wibTimeString
      ]);

      res.json({
        success: true,
        message: 'Event berhasil dibuat',
        data: {
          id: result.insertId,
          nama_event,
          deskripsi,
          location,
          jadwal,
          status: status || 'active',
          peserta: pesertaStringArray,
          created_at: wibTimeString,
          updated_at: wibTimeString
        }
      });
    } catch (error) {
      console.error('Error in createEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Update event (admin only)
  updateEvent: async (req, res) => {
    try {
      const { id } = req.params;
      const { nama_event, deskripsi, location, jadwal, status, peserta } = req.body;

      // Validation
      if (!nama_event || !deskripsi || !location || !jadwal || !peserta) {
        return res.status(400).json({
          success: false,
          message: 'Semua field harus diisi'
        });
      }

      // Convert peserta array to string array format ["1","2","3"]
      const pesertaStringArray = peserta.map(id => id.toString());

      // Get current time in WIB (+7 hours)
      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      const wibTimeString = wibTime.toISOString().slice(0, 19).replace('T', ' ');

      const query = `
        UPDATE events 
        SET nama_event = ?, deskripsi = ?, location = ?, jadwal = ?, status = ?, peserta = ?, updated_at = ?
        WHERE id = ? AND status_deleted = 0
      `;

      const pesertaJson = JSON.stringify(pesertaStringArray);
      
      const [result] = await db.execute(query, [
        nama_event,
        deskripsi,
        location,
        jadwal,
        status || 'active',
        pesertaJson,
        wibTimeString,
        id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }

      res.json({
        success: true,
        message: 'Event berhasil diperbarui',
        data: {
          id,
          nama_event,
          deskripsi,
          location,
          jadwal,
          status,
          peserta: pesertaStringArray
        }
      });
    } catch (error) {
      console.error('Error in updateEvent:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  },

  // Delete event (admin only)
  deleteEvent: async (req, res) => {
    try {
      const { id } = req.params;

      // Get current time in WIB (+7 hours)
      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
      const wibTimeString = wibTime.toISOString().slice(0, 19).replace('T', ' ');

      const query = `
        UPDATE events 
        SET status_deleted = 1, updated_at = ?
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [wibTimeString, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event tidak ditemukan'
        });
      }

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
  },

  // Get event by ID (admin only)
  getEventById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          e.*,
          u.name as creator_name,
          u.email as creator_email
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

  // Get all users for participant selection
  getAllUsers: async (req, res) => {
    try {
      const query = `
        SELECT id, name, email, role
        FROM users
        WHERE status_deleted = 0
        ORDER BY name ASC
      `;
      
      const [results] = await db.execute(query);

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error in getAllUsers:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan server'
      });
    }
  }
};

module.exports = adminEventController; 