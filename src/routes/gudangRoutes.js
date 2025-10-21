const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(auth);

// Get all gudang
router.get('/', async (req, res) => {
  try {
    const db = require('../config/database');
    
    const [gudangs] = await db.execute(`
      SELECT 
        g.id, 
        g.nama, 
        g.lokasi,
        g.telp,
        g.fax,
        g.email,
        g.logo,
        g.penanggung_jawab,
        g.deskripsi,
        g.status_deleted,
        g.created_by,
        g.created_at, 
        g.updated_at,
        u1.name as penanggung_jawab_name,
        u2.name as creator_name
      FROM gudang g
      LEFT JOIN users u1 ON g.penanggung_jawab = u1.id
      LEFT JOIN users u2 ON g.created_by = u2.id
      WHERE g.status_deleted = false
      ORDER BY g.nama ASC
    `);

    res.json({
      success: true,
      message: 'Data gudang berhasil diambil',
      data: gudangs
    });

  } catch (error) {
    console.error('Error getting gudangs:', error);
    res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat mengambil data gudang'
    });
  }
});

module.exports = router; 