const pool = require('../config/database');

// Get all clients
async function getAllClients(req, res) {
  try {
    const query = `
      SELECT 
        c.*, 
        u.name as creator_name,
        COALESCE(COUNT(da.id), 0) as visit_count
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN daily_activities da ON c.id = da.pihak_bersangkutan AND da.deleted_status = false
      WHERE c.status_deleted = false AND c.created_by = ?
      GROUP BY c.id, c.nama, c.email, c.notelp, c.nama_perusahaan, c.alamat, c.description_json, c.status, c.created_by, c.created_at, c.updated_at, u.name
      ORDER BY c.created_at DESC
    `;
    
    const [clients] = await pool.query(query, [req.user.id]);
    
    // Transform description_json to description array
    const transformedClients = clients.map(client => ({
      ...client,
      description: client.description_json ? JSON.parse(client.description_json).items : []
    }));

    res.json({
      success: true,
      data: transformedClients
    });
  } catch (error) {
    console.error('Error in getAllClients:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Get client by ID
async function getClientById(req, res) {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT 
        c.*, 
        u.name as creator_name,
        COALESCE(COUNT(da.id), 0) as visit_count
      FROM clients c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN daily_activities da ON c.id = da.pihak_bersangkutan AND da.deleted_status = false
      WHERE c.id = ? AND c.status_deleted = false AND c.created_by = ?
      GROUP BY c.id, c.nama, c.email, c.notelp, c.nama_perusahaan, c.alamat, c.description_json, c.status, c.created_by, c.created_at, c.updated_at, u.name
    `;
    
    const [clients] = await pool.query(query, [id, req.user.id]);
    
    if (clients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const client = clients[0];
    // Transform description_json to description array
    client.description = client.description_json ? JSON.parse(client.description_json).items : [];

    res.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error in getClientById:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Create new client
async function createClient(req, res) {
  try {
    const {
      nama,
      email,
      notelp,
      nama_perusahaan,
      alamat,
      description,
      status = true
    } = req.body;

    // Simple validation
    if (!nama || !notelp || !nama_perusahaan || !alamat) {
      return res.status(400).json({
        success: false,
        message: 'Nama, nomor telepon, nama perusahaan, dan alamat harus diisi'
      });
    }

    // Create description_json with proper format and escaping
    const description_json = description && description.length > 0 
      ? JSON.stringify(JSON.stringify({ items: description }))
      : JSON.stringify(JSON.stringify({ items: [] }));

    // Get current timestamp
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const query = `
      INSERT INTO clients (
        nama, email, notelp, nama_perusahaan, alamat, 
        description_json, status, created_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(query, [
      nama,
      email || null,
      notelp,
      nama_perusahaan,
      alamat,
      description_json,
      status,
      req.user.id, // From auth middleware
      now, // created_at
      now  // updated_at
    ]);

    // Get the created client
    const [newClient] = await pool.query(
      'SELECT * FROM clients WHERE id = ?',
      [result.insertId]
    );

    // Parse description_json back to array for response
    const parsedDescription = newClient[0].description_json 
      ? JSON.parse(JSON.parse(newClient[0].description_json)).items 
      : [];

    res.status(201).json({
      success: true,
      message: 'Client created successfully',
      data: {
        ...newClient[0],
        description: parsedDescription
      }
    });
  } catch (error) {
    console.error('Error in createClient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Update client
async function updateClient(req, res) {
  try {
    const { id } = req.params;
    const {
      nama,
      email,
      notelp,
      nama_perusahaan,
      alamat,
      description,
      status
    } = req.body;

    // Check if client exists and belongs to the current user
    const [existingClient] = await pool.query(
      'SELECT * FROM clients WHERE id = ? AND status_deleted = false AND created_by = ?',
      [id, req.user.id]
    );

    if (existingClient.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Create description_json with proper format and escaping
    const description_json = description && description.length > 0 
      ? JSON.stringify(JSON.stringify({ items: description }))
      : JSON.stringify(JSON.stringify({ items: [] }));

    const query = `
      UPDATE clients 
      SET 
        nama = ?,
        email = ?,
        notelp = ?,
        nama_perusahaan = ?,
        alamat = ?,
        description_json = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status_deleted = false AND created_by = ?
    `;

    await pool.query(query, [
      nama || existingClient[0].nama,
      email || existingClient[0].email || null,
      notelp || existingClient[0].notelp,
      nama_perusahaan || existingClient[0].nama_perusahaan,
      alamat || existingClient[0].alamat,
      description_json,
      status !== undefined ? status : existingClient[0].status,
      id,
      req.user.id
    ]);

    // Get the updated client
    const [updatedClient] = await pool.query(
      'SELECT * FROM clients WHERE id = ?',
      [id]
    );

    // Parse description_json back to array for response
    const parsedDescription = updatedClient[0].description_json 
      ? JSON.parse(JSON.parse(updatedClient[0].description_json)).items 
      : [];

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: {
        ...updatedClient[0],
        description: parsedDescription
      }
    });
  } catch (error) {
    console.error('Error in updateClient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

// Soft delete client
async function deleteClient(req, res) {
  try {
    const { id } = req.params;

    // Check if client exists and belongs to the current user
    const [existingClient] = await pool.query(
      'SELECT * FROM clients WHERE id = ? AND status_deleted = false AND created_by = ?',
      [id, req.user.id]
    );

    if (existingClient.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Soft delete
    await pool.query(
      'UPDATE clients SET status_deleted = true WHERE id = ? AND created_by = ?',
      [id, req.user.id]
    );

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error in deleteClient:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}

module.exports = {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient
}; 