const pool = require('../config/database');

// Helper function to format date to YYYY-MM-DD
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get today's attendance for current user
async function getTodayAbsensi(req, res) {
  try {
    const userId = req.user.id;
    const today = formatDate(new Date());

    // First, check if user has any daily activities today
    const activityQuery = `
      SELECT COUNT(*) as activity_count
      FROM daily_activities
      WHERE created_by = ?
      AND DATE(created_at) = ?
      AND deleted_status = false
    `;
    const [activityResult] = await pool.query(activityQuery, [userId, today]);
    const activityCount = activityResult[0].activity_count;

    // Get attendance record if exists
    const absensiQuery = `
      SELECT a.*, u.email as user_email, da.perihal as activity_perihal
      FROM absensi a
      LEFT JOIN users u ON a.id_user = u.id
      LEFT JOIN daily_activities da ON a.id_daily_activity = da.id
      WHERE a.id_user = ? 
      AND DATE(a.tgl_absen) = ?
      AND a.deleted_status = false
      ORDER BY a.tgl_absen DESC
      LIMIT 1
    `;

    const [absensi] = await pool.query(absensiQuery, [userId, today]);

    if (!absensi || absensi.length === 0) {
      // If no attendance record, return status based on activity count
      return res.json({
        success: true,
        data: {
          status_absen: activityCount >= 3 ? 'masuk' : 'waiting',
          tgl_absen: new Date(),
          activity_count: activityCount,
          required_count: 3
        },
        message: activityCount >= 3 ? 'Sudah ada absensi otomatis' : 'Menunggu aktivitas'
      });
    }

    // If attendance exists, include activity count in response
    const response = {
      ...absensi[0],
      activity_count: activityCount,
      required_count: 3
    };

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error in getTodayAbsensi:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data absensi'
    });
  }
}

// Get attendance history for current user
async function getAbsensiHistory(req, res) {
  try {
    const userId = req.user.id;

    const query = `
      SELECT a.*, u.email as user_email, da.perihal as activity_perihal
      FROM absensi a
      LEFT JOIN users u ON a.id_user = u.id
      LEFT JOIN daily_activities da ON a.id_daily_activity = da.id
      WHERE a.id_user = ? 
      AND a.deleted_status = false
      ORDER BY a.tgl_absen DESC
      LIMIT 30
    `;

    const [absensi] = await pool.query(query, [userId]);

    res.json({
      success: true,
      data: absensi
    });
  } catch (error) {
    console.error('Error in getAbsensiHistory:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil riwayat absensi'
    });
  }
}

// Create new attendance record
async function createAbsensi(req, res) {
  try {
    const userId = req.user.id;
    const { status_absen, id_daily_activity } = req.body;
    const today = formatDate(new Date());

    // Check if user already has attendance for today
    const checkQuery = `
      SELECT * FROM absensi 
      WHERE id_user = ? 
      AND DATE(tgl_absen) = ?
      AND deleted_status = false
    `;
    const [existingAbsensi] = await pool.query(checkQuery, [userId, today]);

    if (existingAbsensi.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absensi hari ini'
      });
    }

    // Validate status_absen
    const validStatus = ['masuk', 'pulang', 'izin', 'sakit'];
    if (!validStatus.includes(status_absen)) {
      return res.status(400).json({
        success: false,
        message: 'Status absensi tidak valid'
      });
    }

    // Insert new attendance record
    const insertQuery = `
      INSERT INTO absensi (
        status_absen,
        tgl_absen,
        id_user,
        id_daily_activity,
        deleted_status
      ) VALUES (?, ?, ?, ?, false)
    `;

    const [result] = await pool.query(insertQuery, [
      status_absen,
      new Date(),
      userId,
      id_daily_activity || null
    ]);

    // Get the created attendance record
    const [newAbsensi] = await pool.query(
      `SELECT a.*, u.email as user_email, da.perihal as activity_perihal
       FROM absensi a
       LEFT JOIN users u ON a.id_user = u.id
       LEFT JOIN daily_activities da ON a.id_daily_activity = da.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.json({
      success: true,
      data: newAbsensi[0],
      message: 'Absensi berhasil dicatat'
    });
  } catch (error) {
    console.error('Error in createAbsensi:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mencatat absensi'
    });
  }
}

// Update attendance record
async function updateAbsensi(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { status_absen, id_daily_activity } = req.body;

    // Check if attendance exists and belongs to user
    const checkQuery = `
      SELECT * FROM absensi 
      WHERE id = ? 
      AND id_user = ? 
      AND deleted_status = false
    `;
    const [existingAbsensi] = await pool.query(checkQuery, [id, userId]);

    if (existingAbsensi.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data absensi tidak ditemukan'
      });
    }

    // Validate status_absen
    const validStatus = ['masuk', 'pulang', 'izin', 'sakit'];
    if (!validStatus.includes(status_absen)) {
      return res.status(400).json({
        success: false,
        message: 'Status absensi tidak valid'
      });
    }

    // Update attendance record
    const updateQuery = `
      UPDATE absensi 
      SET status_absen = ?,
          id_daily_activity = ?
      WHERE id = ? AND id_user = ?
    `;

    await pool.query(updateQuery, [
      status_absen,
      id_daily_activity || null,
      id,
      userId
    ]);

    // Get the updated attendance record
    const [updatedAbsensi] = await pool.query(
      `SELECT a.*, u.email as user_email, da.perihal as activity_perihal
       FROM absensi a
       LEFT JOIN users u ON a.id_user = u.id
       LEFT JOIN daily_activities da ON a.id_daily_activity = da.id
       WHERE a.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: updatedAbsensi[0],
      message: 'Absensi berhasil diperbarui'
    });
  } catch (error) {
    console.error('Error in updateAbsensi:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memperbarui absensi'
    });
  }
}

// Soft delete attendance record
async function deleteAbsensi(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if attendance exists and belongs to user
    const checkQuery = `
      SELECT * FROM absensi 
      WHERE id = ? 
      AND id_user = ? 
      AND deleted_status = false
    `;
    const [existingAbsensi] = await pool.query(checkQuery, [id, userId]);

    if (existingAbsensi.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Data absensi tidak ditemukan'
      });
    }

    // Soft delete attendance record
    const deleteQuery = `
      UPDATE absensi 
      SET deleted_status = true
      WHERE id = ? AND id_user = ?
    `;

    await pool.query(deleteQuery, [id, userId]);

    res.json({
      success: true,
      message: 'Absensi berhasil dihapus'
    });
  } catch (error) {
    console.error('Error in deleteAbsensi:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat menghapus absensi'
    });
  }
}

module.exports = {
  getTodayAbsensi,
  getAbsensiHistory,
  createAbsensi,
  updateAbsensi,
  deleteAbsensi
}; 