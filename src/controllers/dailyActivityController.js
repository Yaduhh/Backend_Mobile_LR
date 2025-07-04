const db = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'upload/dokumentasi');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config for dokumentasi
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file gambar yang diperbolehkan'), false);
    }
  }
});

class DailyActivityController {
  // Get all daily activities
  static async getAllDailyActivities(req, res) {
    try {
      let { startDate, endDate, userId, clientId } = req.query;
      let where = 'da.deleted_status = false AND c.created_by = ?';
      let params = [req.user.id];

      // Default tanggal: hari ini jika tidak dikirim
      const today = new Date();
      const pad = n => n < 10 ? '0' + n : n;
      const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
      if (!startDate) startDate = todayStr;
      if (!endDate) endDate = todayStr;

      // Debug log untuk parameter
      console.log('Query params:', { startDate, endDate, userId, clientId });

      if (userId) {
        where += ' AND da.created_by = ?';
        params.push(userId);
      }
      if (clientId) {
        where += ' AND da.pihak_bersangkutan = ?';
        params.push(clientId);
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
               c.nama as client_name
        FROM daily_activities da
        LEFT JOIN users u ON da.created_by = u.id
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE ${where}
        ORDER BY da.created_at DESC
      `;
      // Debug log untuk query dan params
      console.log('SQL Query:', query);
      console.log('SQL Params:', params);
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
        
        // Parse komentar dengan format yang benar
        let komentar = [];
        try {
          const komentarRaw = activity.komentar;
          if (komentarRaw) {
            // Handle format string JSON yang di-wrap kutip ganda
            let str = komentarRaw;
            if (str.startsWith('"') && str.endsWith('"')) {
              str = str.slice(1, -1);
            }
            // Unescape kutip ganda
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
      console.error('Error fetching daily activities:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily activities'
      });
    }
  }

  // Get daily activity by ID
  static async getDailyActivityById(req, res) {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT da.*, 
               u.email as creator_email,
               c.nama as client_name
        FROM daily_activities da
        LEFT JOIN users u ON da.created_by = u.id
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE da.id = ? AND da.deleted_status = false AND c.created_by = ?
      `;
      
      const [activities] = await db.query(query, [id, req.user.id]);
      
      if (activities.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Daily activity not found'
        });
      }

      const activity = activities[0];
      
      // Parse dokumentasi
      try {
        activity.dokumentasi = JSON.parse(activity.dokumentasi || '[]');
      } catch (e) {
        activity.dokumentasi = [];
      }
      
      // Parse komentar dengan format yang benar
      try {
        const komentarRaw = activity.komentar;
        if (komentarRaw) {
          // Handle format string JSON yang di-wrap kutip ganda
          let str = komentarRaw;
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.slice(1, -1);
          }
          // Unescape kutip ganda
          str = str.replace(/\\"/g, '"');
          const parsed = JSON.parse(str);
          activity.komentar = Array.isArray(parsed) ? parsed : [];
        } else {
          activity.komentar = [];
        }
      } catch (e) {
        console.error('Error parsing komentar:', e);
        activity.komentar = [];
      }

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('Error fetching daily activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily activity'
      });
    }
  }

  // Get daily activities by client ID
  static async getDailyActivitiesByClientId(req, res) {
    try {
      const { clientId } = req.params;
      
      const query = `
        SELECT da.*, 
               u.email as creator_email,
               c.nama as client_name
        FROM daily_activities da
        LEFT JOIN users u ON da.created_by = u.id
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE da.pihak_bersangkutan = ? AND da.deleted_status = false AND c.created_by = ?
        ORDER BY da.created_at DESC
      `;
      
      const [activities] = await db.query(query, [clientId, req.user.id]);
      
      // Parse JSON fields
      const formattedActivities = activities.map(activity => {
        // Parse dokumentasi
        let dokumentasi = [];
        try {
          dokumentasi = JSON.parse(activity.dokumentasi || '[]');
        } catch (e) {
          dokumentasi = [];
        }
        
        // Parse komentar dengan format yang benar
        let komentar = [];
        try {
          const komentarRaw = activity.komentar;
          if (komentarRaw) {
            // Handle format string JSON yang di-wrap kutip ganda
            let str = komentarRaw;
            if (str.startsWith('"') && str.endsWith('"')) {
              str = str.slice(1, -1);
            }
            // Unescape kutip ganda
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
      console.error('Error fetching daily activities by client:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily activities for client'
      });
    }
  }

  // Create new daily activity
  static async createDailyActivity(req, res) {
    try {
      let dokumentasiArr = [];
      if (req.files && req.files.length > 0) {
        dokumentasiArr = req.files.map(file => `dokumentasi/${file.filename}`);
      } else if (req.body.dokumentasi) {
        // If dokumentasi is sent as JSON string (for update without new upload)
        try {
          dokumentasiArr = JSON.parse(req.body.dokumentasi);
        } catch (e) {
          dokumentasiArr = [];
        }
      }
      const {
        perihal,
        pihak_bersangkutan,
        summary,
        lokasi
      } = req.body;

      // Validate required fields
      if (!perihal || !pihak_bersangkutan || !summary || !lokasi) {
        return res.status(400).json({
          success: false,
          message: 'Semua field wajib diisi'
        });
      }

      // Check if client exists and belongs to user
      const [clientCheck] = await db.query(
        'SELECT id FROM clients WHERE id = ? AND status_deleted = false AND created_by = ?',
        [pihak_bersangkutan, req.user.id]
      );

      if (clientCheck.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Client yang dipilih tidak ditemukan atau tidak memiliki akses'
        });
      }

      const created_by = req.user.id; // Assuming user info is available in req.user
      const now = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      const query = `
        INSERT INTO daily_activities (
          dokumentasi,
          perihal,
          pihak_bersangkutan,
          summary,
          lokasi,
          created_by,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      // Format dokumentasi agar slash di-escape (dokumentasi\/namafile.png)
      const dokumentasiJson = JSON.stringify(dokumentasiArr).replace(/\//g, '\\/');

      const [result] = await db.query(query, [
        dokumentasiJson,
        perihal,
        pihak_bersangkutan,
        summary,
        lokasi,
        created_by,
        now,
        now
      ]);

      const [newActivity] = await db.query(
        'SELECT * FROM daily_activities WHERE id = ?',
        [result.insertId]
      );

      // === ABSENSI LOGIC START === //
      // 1. Hitung jumlah daily activity user hari ini
      const userId = created_by;
      const todayStr = now.slice(0, 10); // format YYYY-MM-DD
      const [countResult] = await db.query(
        `SELECT COUNT(*) as count FROM daily_activities WHERE created_by = ? AND DATE(created_at) = ? AND deleted_status = false`,
        [userId, todayStr]
      );
      const activityCount = countResult[0].count;

      // 2. Cek absensi hari ini
      const [absensiResult] = await db.query(
        `SELECT * FROM absensi WHERE id_user = ? AND DATE(tgl_absen) = ? AND deleted_status = false`,
        [userId, todayStr]
      );

      let absensiInfo = null;
      let statusAbsen = activityCount >= 3 ? '1' : '0';
      if (absensiResult.length === 0) {
        const nowTimestamp = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        // Insert absensi baru
        const [insertAbsensi] = await db.query(
          `INSERT INTO absensi (status_absen, tgl_absen, id_user, id_daily_activity, count, deleted_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, false, ?, ?)`,
          [statusAbsen, now, userId, result.insertId, activityCount, nowTimestamp, nowTimestamp]
        );
        // Ambil data absensi yang baru dibuat
        const [newAbsensi] = await db.query(
          `SELECT * FROM absensi WHERE id = ?`,
          [insertAbsensi.insertId]
        );
        absensiInfo = newAbsensi[0];
      } else {
        // Update absensi yang sudah ada
        const absensiId = absensiResult[0].id;
        const nowTimestamp = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
        await db.query(
          `UPDATE absensi SET count = ?, id_daily_activity = ?, status_absen = ?, updated_at = ? WHERE id = ?`,
          [activityCount, result.insertId, statusAbsen, nowTimestamp, absensiId]
        );
        // Ambil data absensi yang sudah diupdate
        const [updatedAbsensi] = await db.query(
          `SELECT * FROM absensi WHERE id = ?`,
          [absensiId]
        );
        absensiInfo = updatedAbsensi[0];
      }
      // === ABSENSI LOGIC END === //

      if (newActivity.length > 0) {
        const activity = newActivity[0];
        activity.dokumentasi = JSON.parse(activity.dokumentasi || '[]');
        activity.komentar = JSON.parse(activity.komentar || '[]');

        res.status(201).json({
          success: true,
          data: activity,
          absensi: absensiInfo
        });
      } else {
        throw new Error('Failed to retrieve created activity');
      }
    } catch (error) {
      console.error('Error creating daily activity:', error);
      
      // Handle specific database errors
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
          success: false,
          message: 'Client yang dipilih tidak ditemukan'
        });
      }
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({
          success: false,
          message: 'Data duplikat ditemukan'
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to create daily activity'
      });
    }
  }

  // Update daily activity
  static async updateDailyActivity(req, res) {
    try {
      const { id } = req.params;
      let dokumentasiArr = [];
      let perihal, pihak_bersangkutan, summary, lokasi;
      // Cek apakah request multipart (ada file)
      if (req.files && req.files.length > 0) {
        // Ambil file baru
        dokumentasiArr = req.files.map(file => `dokumentasi/${file.filename}`);
        // Ambil file lama dari body (jika ada)
        if (req.body.dokumentasi) {
          try {
            let oldDocs = [];
            if (Array.isArray(req.body.dokumentasi)) {
              oldDocs = req.body.dokumentasi;
            } else if (typeof req.body.dokumentasi === 'string') {
              // Bisa jadi string JSON array atau string path tunggal
              if (req.body.dokumentasi.trim().startsWith('[')) {
                oldDocs = JSON.parse(req.body.dokumentasi);
              } else {
                oldDocs = [req.body.dokumentasi];
              }
            }
            // Hanya masukkan path lama yang bukan file://
            dokumentasiArr = [...oldDocs.filter(doc => typeof doc === 'string' && !doc.startsWith('file://')), ...dokumentasiArr];
          } catch (e) {}
        }
        perihal = req.body.perihal;
        pihak_bersangkutan = req.body.pihak_bersangkutan;
        summary = req.body.summary;
        lokasi = req.body.lokasi;
      } else {
        // JSON biasa
        const { dokumentasi = [], perihal: p, pihak_bersangkutan: pb, summary: s, lokasi: l } = req.body;
        // Jika dokumentasi string (bukan array), parse
        let dokArr = dokumentasi;
        if (typeof dokumentasi === 'string') {
          try {
            dokArr = JSON.parse(dokumentasi);
          } catch (e) {
            dokArr = [dokumentasi];
          }
        }
        dokumentasiArr = dokArr;
        perihal = p;
        pihak_bersangkutan = pb;
        summary = s;
        lokasi = l;
      }
      const now = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const query = `
        UPDATE daily_activities
        SET dokumentasi = ?,
            perihal = ?,
            pihak_bersangkutan = ?,
            summary = ?,
            lokasi = ?,
            updated_at = ?
        WHERE id = ? AND deleted_status = false AND EXISTS (
          SELECT 1 FROM clients c 
          WHERE c.id = daily_activities.pihak_bersangkutan 
          AND c.created_by = ? 
          AND c.status_deleted = false
        )
      `;
      const dokumentasiJson = JSON.stringify(dokumentasiArr).replace(/\//g, '\\/');
      const [result] = await db.query(query, [
        dokumentasiJson,
        perihal,
        pihak_bersangkutan,
        summary,
        lokasi,
        now,
        id,
        req.user.id
      ]);
      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Daily activity not found'
        });
      }
      const [updatedActivity] = await db.query(
        'SELECT * FROM daily_activities WHERE id = ?',
        [id]
      );
      if (updatedActivity.length > 0) {
        const activity = updatedActivity[0];
        
        // Parse dokumentasi
        try {
          activity.dokumentasi = JSON.parse(activity.dokumentasi || '[]');
        } catch (e) {
          activity.dokumentasi = [];
        }
        
        // Parse komentar dengan format yang benar
        try {
          const komentarRaw = activity.komentar;
          if (komentarRaw) {
            // Handle format string JSON yang di-wrap kutip ganda
            let str = komentarRaw;
            if (str.startsWith('"') && str.endsWith('"')) {
              str = str.slice(1, -1);
            }
            // Unescape kutip ganda
            str = str.replace(/\\"/g, '"');
            const parsed = JSON.parse(str);
            activity.komentar = Array.isArray(parsed) ? parsed : [];
          } else {
            activity.komentar = [];
          }
        } catch (e) {
          console.error('Error parsing komentar:', e);
          activity.komentar = [];
        }
        
        res.json({
          success: true,
          data: activity
        });
      } else {
        throw new Error('Failed to retrieve updated activity');
      }
    } catch (error) {
      console.error('Error updating daily activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update daily activity'
      });
    }
  }

  // Delete daily activity (soft delete)
  static async deleteDailyActivity(req, res) {
    try {
      const { id } = req.params;
      const now = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

      const query = `
        UPDATE daily_activities
        SET deleted_status = true,
            updated_at = ?
        WHERE id = ? AND deleted_status = false AND EXISTS (
          SELECT 1 FROM clients c 
          WHERE c.id = daily_activities.pihak_bersangkutan 
          AND c.created_by = ? 
          AND c.status_deleted = false
        )
      `;

      const [result] = await db.query(query, [now, id, req.user.id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Daily activity not found'
        });
      }

      res.json({
        success: true,
        message: 'Daily activity deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting daily activity:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete daily activity'
      });
    }
  }

  // Tambah komentar ke daily activity
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
      
      // Ambil data activity
      const [rows] = await db.query(`
        SELECT da.komentar 
        FROM daily_activities da
        LEFT JOIN clients c ON da.pihak_bersangkutan = c.id
        WHERE da.id = ? AND da.deleted_status = false AND c.created_by = ? AND c.status_deleted = false
      `, [id, req.user.id]);
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
      const userNameFinal = (req.body.user_name && req.body.user_name.trim()) ? req.body.user_name.trim() : (user.name || 'User');
      
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
      console.error('Error add comment:', error);
      res.status(500).json({ success: false, message: 'Gagal menambah komentar' });
    }
  }
}

module.exports = { DailyActivityController, upload };