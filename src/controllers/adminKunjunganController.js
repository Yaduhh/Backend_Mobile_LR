const db = require('../config/database');

class AdminKunjunganController {
  // Get all sales users for filter dropdown
  static async getAllSales(req, res) {
    try {
      const query = `
        SELECT id, email, name, role
        FROM users 
        WHERE role = 2 AND status_deleted = false
        ORDER BY name ASC
      `;
      const [sales] = await db.query(query);
      res.json({
        success: true,
        data: sales
      });
    } catch (error) {
      console.error('Error fetching sales users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales users'
      });
    }
  }

  // Get all daily activities (admin, no userId filter)
  static async getAllKunjungan(req, res) {
    try {
      let { startDate, endDate, clientId, userId } = req.query;
      let where = 'da.deleted_status = false';
      let params = [];

      // Default tanggal: hari ini jika tidak dikirim
      const today = new Date();
      const pad = n => n < 10 ? '0' + n : n;
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      if (!startDate) startDate = todayStr;
      if (!endDate) endDate = todayStr;

      if (clientId) {
        where += ' AND da.pihak_bersangkutan = ?';
        params.push(clientId);
      }
      if (userId) {
        where += ' AND da.created_by = ?';
        params.push(userId);
      }
      if (startDate && endDate) {
        where += ' AND DATE(da.created_at) BETWEEN ? AND ?';
        params.push(startDate, endDate);
      } else if (startDate) {
        where += ' AND DATE(da.created_at) = ?';
        params.push(startDate);
      }
      
      const query = `
        SELECT da.*, 
               u.email as creator_email,
               u.name as creator_name,
               c.nama as client_name
        FROM daily_activities da
        LEFT JOIN users u ON da.created_by = u.id
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE ${where}
        ORDER BY da.created_at DESC
      `;
      const [activities] = await db.query(query, params);
      // Parse JSON fields
      const formattedActivities = activities.map(activity => {
        // Parse dokumentasi
        let dokumentasi = [];
        try {
          dokumentasi = JSON.parse(activity.dokumentasi || '[]');
        } catch (e) {
          dokumentasi = [];
        }
        // Parse komentar
        let komentar = [];
        try {
          const komentarRaw = activity.komentar;
          if (komentarRaw) {
            let str = komentarRaw;
            if (str.startsWith('"') && str.endsWith('"')) {
              str = str.slice(1, -1);
            }
            str = str.replace(/\\"/g, '"');
            const parsed = JSON.parse(str);
            komentar = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          komentar = [];
        }
        return {
          ...activity,
          dokumentasi,
          komentar
        };
      });
      res.json({
        success: true,
        data: formattedActivities
      });
    } catch (error) {
      console.error('Error fetching admin kunjungan:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch kunjungan (admin)'
      });
    }
  }

  // Get kunjungan by ID
  static async getKunjunganById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT da.*, 
               u.email as creator_email,
               u.name as creator_name,
               c.nama as client_name
        FROM daily_activities da
        LEFT JOIN users u ON da.created_by = u.id
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE da.id = ? AND da.deleted_status = false
      `;
      
      const [activities] = await db.query(query, [id]);
      
      if (activities.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Kunjungan tidak ditemukan'
        });
      }

      const activity = activities[0];
      
      // Parse dokumentasi JSON if exists
      let dokumentasi = [];
      try {
        dokumentasi = JSON.parse(activity.dokumentasi || '[]');
      } catch (e) {
        dokumentasi = [];
      }
      
      // Parse komentar
      let komentar = [];
      try {
        const komentarRaw = activity.komentar;
        if (komentarRaw) {
          let str = komentarRaw;
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.slice(1, -1);
          }
          str = str.replace(/\\"/g, '"');
          const parsed = JSON.parse(str);
          komentar = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        komentar = [];
      }
      
      const formattedActivity = {
        ...activity,
        dokumentasi,
        komentar
      };
      
      res.json({
        success: true,
        data: formattedActivity,
        message: 'Detail kunjungan berhasil diambil'
      });
    } catch (error) {
      console.error('Error in getKunjunganById:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil detail kunjungan'
      });
    }
  }

  // Get kunjungan by client ID
  static async getKunjunganByClientId(req, res) {
    try {
      const { clientId } = req.params;
      
      const query = `
        SELECT da.*, 
               u.email as creator_email,
               u.name as creator_name,
               c.nama as client_name
        FROM daily_activities da
        LEFT JOIN users u ON da.created_by = u.id
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE da.pihak_bersangkutan = ? AND da.deleted_status = false
        ORDER BY da.created_at DESC
      `;
      
      const [activities] = await db.query(query, [clientId]);
      
      // Parse JSON fields
      const formattedActivities = activities.map(activity => {
        // Parse dokumentasi
        let dokumentasi = [];
        try {
          dokumentasi = JSON.parse(activity.dokumentasi || '[]');
        } catch (e) {
          dokumentasi = [];
        }
        // Parse komentar
        let komentar = [];
        try {
          const komentarRaw = activity.komentar;
          if (komentarRaw) {
            let str = komentarRaw;
            if (str.startsWith('"') && str.endsWith('"')) {
              str = str.slice(1, -1);
            }
            str = str.replace(/\\"/g, '"');
            const parsed = JSON.parse(str);
            komentar = Array.isArray(parsed) ? parsed : [];
          }
        } catch (e) {
          komentar = [];
        }
        return {
          ...activity,
          dokumentasi,
          komentar
        };
      });
      
      res.json({
        success: true,
        data: formattedActivities,
        message: 'Data kunjungan client berhasil diambil'
      });
    } catch (error) {
      console.error('Error in getKunjunganByClientId:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil data kunjungan client'
      });
    }
  }

  // Get kunjungan statistics
  static async getKunjunganStats(req, res) {
    try {
      // Total kunjungan
      const [totalKunjungan] = await db.query('SELECT COUNT(*) as total FROM daily_activities WHERE deleted_status = false');
      
      // Kunjungan hari ini
      const [todayKunjungan] = await db.query(`
        SELECT COUNT(*) as total 
        FROM daily_activities 
        WHERE deleted_status = false 
          AND DATE(created_at) = CURDATE()
      `);
      
      // Kunjungan bulan ini
      const [thisMonthKunjungan] = await db.query(`
        SELECT COUNT(*) as total 
        FROM daily_activities 
        WHERE deleted_status = false 
          AND YEAR(created_at) = YEAR(CURDATE()) 
          AND MONTH(created_at) = MONTH(CURDATE())
      `);
      
      // Kunjungan per sales
      const [kunjunganBySales] = await db.query(`
        SELECT 
          u.name as sales_name,
          COUNT(da.id) as kunjungan_count
        FROM users u
        LEFT JOIN daily_activities da ON u.id = da.created_by AND da.deleted_status = false
        WHERE u.role = 2
        GROUP BY u.id, u.name
        ORDER BY kunjungan_count DESC
      `);
      
      // Kunjungan per client
      const [kunjunganByClient] = await db.query(`
        SELECT 
          c.nama as client_name,
          COUNT(da.id) as kunjungan_count
        FROM clients c
        LEFT JOIN daily_activities da ON c.id = da.pihak_bersangkutan AND da.deleted_status = false
        WHERE c.status_deleted = false
        GROUP BY c.id, c.nama
        ORDER BY kunjungan_count DESC
        LIMIT 10
      `);
      
      // Recent kunjungan (last 7 days)
      const [recentKunjungan] = await db.query(`
        SELECT COUNT(*) as total 
        FROM daily_activities 
        WHERE deleted_status = false 
          AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);
      
      res.json({
        success: true,
        data: {
          total: totalKunjungan[0].total,
          today: todayKunjungan[0].total,
          thisMonth: thisMonthKunjungan[0].total,
          recent: recentKunjungan[0].total,
          bySales: kunjunganBySales,
          byClient: kunjunganByClient
        },
        message: 'Statistik kunjungan berhasil diambil'
      });
    } catch (error) {
      console.error('Error in getKunjunganStats:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil statistik kunjungan'
      });
    }
  }

  // Tambah komentar ke kunjungan (admin)
  static async addComment(req, res) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ success: false, message: 'Komentar tidak boleh kosong' });
      }
      
      // Ambil user dari req.user
      const user = req.user;
      if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }
      
      // Ambil data activity (admin bisa akses semua kunjungan)
      const [rows] = await db.query(`
        SELECT da.komentar 
        FROM daily_activities da
        WHERE da.id = ? AND da.deleted_status = false
      `, [id]);
      if (!rows.length) {
        return res.status(404).json({ success: false, message: 'Data tidak ditemukan' });
      }
      
      // Parse komentar yang ada
      let komentarArr = [];
      try {
        const komentarRaw = rows[0].komentar;
        if (komentarRaw) {
          // Handle format string JSON yang di-wrap kutip ganda
          let str = komentarRaw;
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.slice(1, -1);
          }
          // Unescape kutip ganda
          str = str.replace(/\\"/g, '"');
          const parsed = JSON.parse(str);
          komentarArr = Array.isArray(parsed) ? parsed : [];
        }
      } catch (e) {
        console.error('Error parsing existing comments:', e);
        komentarArr = [];
      }
      
      // Format timestamp as YYYY-MM-DDTHH:mm:ss+07:00
      const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
      const pad = n => n < 10 ? '0' + n : n;
      const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}+07:00`;
      
      // Ambil user_name dari body jika ada, jika tidak pakai user.name
      const userNameFinal = (req.body.user_name && req.body.user_name.trim()) ? req.body.user_name.trim() : (user.name || 'Admin');
      
      // Tambah komentar baru di akhir array (komentar terbaru di bawah)
      const newComment = {
        user_id: user.id,
        user_name: userNameFinal,
        user_profile: user.profile || null,
        message: message.trim(),
        timestamp: timestamp,
      };
      
      komentarArr.push(newComment);
      
      // Simpan ke database sebagai string array JSON dengan tanda kutip ganda di awal/akhir
      let komentarJson = JSON.stringify(komentarArr);
      komentarJson = `"${komentarJson.replace(/"/g, '\\"')}"`;
      
      await db.query('UPDATE daily_activities SET komentar = ? WHERE id = ?', [komentarJson, id]);
      
      res.json({ success: true, data: newComment });
    } catch (error) {
      console.error('Error add comment (admin):', error);
      res.status(500).json({ success: false, message: 'Gagal menambah komentar' });
    }
  }
}

module.exports = { AdminKunjunganController };