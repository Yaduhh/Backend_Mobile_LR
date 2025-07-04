const pool = require('../config/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'upload/arsip_files');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config for arsip files
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
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png', 'application/zip', 'application/x-rar-compressed'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Get all arsip files
async function getAllArsipFiles(req, res) {
  try {
    const { clientId } = req.query;
    let where = 'af.status_deleted = 0 AND c.status_deleted = 0 AND c.created_by = ?';
    let params = [req.user.id];

    if (clientId) {
      where += ' AND af.id_client = ?';
      params.push(clientId);
    }

    const query = `
      SELECT af.*, u.name as creator_name, c.nama as client_name
      FROM arsip_file af
      INNER JOIN clients c ON af.id_client = c.id
      LEFT JOIN users u ON af.created_by = u.id
      WHERE ${where}
      ORDER BY af.created_at DESC
    `;

    const [arsipFiles] = await pool.query(query, params);

    res.json({
      success: true,
      data: arsipFiles
    });
  } catch (error) {
    console.error('Error in getAllArsipFiles:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Create arsip file
async function createArsipFile(req, res) {
  try {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }

      const { nama, id_client } = req.body;
      const file = req.file;

      if (!nama || !id_client || !file) {
        return res.status(400).json({
          success: false,
          message: 'Nama, id_client, dan file harus diisi'
        });
      }

      // Check if client exists and belongs to user
      const [clientCheck] = await pool.query(
        'SELECT id FROM clients WHERE id = ? AND status_deleted = 0 AND created_by = ?',
        [id_client, req.user.id]
      );

      if (clientCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Client tidak ditemukan atau tidak memiliki akses'
        });
      }

      const filePath = `arsip_files/${file.filename}`;

      const query = `
        INSERT INTO arsip_file (
          nama, id_client, file, status_deleted, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const [result] = await pool.query(query, [
        nama,
        id_client,
        filePath,
        false,
        req.user.id
      ]);

      // Get the created arsip file
      const [newArsipFile] = await pool.query(
        'SELECT * FROM arsip_file WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json({
        success: true,
        message: 'Arsip file berhasil ditambahkan',
        data: newArsipFile[0]
      });
    });
  } catch (error) {
    console.error('Error in createArsipFile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Delete arsip file (soft delete)
async function deleteArsipFile(req, res) {
  try {
    const { id } = req.params;

    // Check if arsip file exists and belongs to user
    const [arsipFile] = await pool.query(
      'SELECT * FROM arsip_file WHERE id = ? AND status_deleted = 0 AND created_by = ?',
      [id, req.user.id]
    );

    if (arsipFile.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Arsip file tidak ditemukan atau tidak memiliki akses'
      });
    }

    // Soft delete
    await pool.query(
      'UPDATE arsip_file SET status_deleted = 1, updated_at = NOW() WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Arsip file berhasil dihapus'
    });
  } catch (error) {
    console.error('Error in deleteArsipFile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = {
  getAllArsipFiles,
  createArsipFile,
  deleteArsipFile,
  upload
}; 