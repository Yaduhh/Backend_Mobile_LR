const db = require('../config/database');
const { generateLaravelCompatibleHash } = require('../utils/bcryptHelper');

class User {
  static async findByEmail(email) {
    if (!email) return null;
    
    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND status_deleted = 0',
      [email]
    );
    return rows[0];
  }

  static async create(userData) {
    const { name, email, password, role, notelp, profile } = userData;
    // Hash password menggunakan helper yang kompatibel dengan Laravel
    const hashedPassword = await generateLaravelCompatibleHash(password, 12);
    
    const [result] = await db.execute(
      `INSERT INTO users (name, email, password, role, notelp, profile, status, status_deleted) 
       VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
      [name, email, hashedPassword, role, notelp || null, profile || null]
    );
    
    return result.insertId;
  }

  static async update(id, userData) {
    const { name, email, notelp, profile, status } = userData;
    
    // Build dynamic query and parameters
    let query = 'UPDATE users SET ';
    const params = [];
    const updates = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (notelp !== undefined) {
      updates.push('notelp = ?');
      params.push(notelp);
    }
    if (profile !== undefined) {
      updates.push('profile = ?');
      params.push(profile);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params.push(status);
    }

    if (updates.length === 0) {
      return false; // No fields to update
    }

    query += updates.join(', ') + ' WHERE id = ? AND status_deleted = 0';
    params.push(id);

    const [result] = await db.execute(query, params);
    return result.affectedRows > 0;
  }

  static async softDelete(id) {
    if (!id) return false;
    
    const [result] = await db.execute(
      'UPDATE users SET status_deleted = 1 WHERE id = ?',
      [id]
    );
    return result.affectedRows > 0;
  }

  static async findAll() {
    const [rows] = await db.execute(
      'SELECT id, name, email, role, notelp, profile, status FROM users WHERE status_deleted = 0'
    );
    return rows;
  }

  static async findById(id) {
    if (!id) return null;
    
    const [rows] = await db.execute(
      'SELECT id, name, email, role, notelp, profile, status FROM users WHERE id = ? AND status_deleted = 0',
      [id]
    );
    return rows[0];
  }

  static async findByIdWithPassword(id) {
    if (!id) return null;
    
    const [rows] = await db.execute(
      'SELECT id, name, email, password, role, notelp, profile, status FROM users WHERE id = ? AND status_deleted = 0',
      [id]
    );
    return rows[0];
  }

  static async updatePassword(userId, hashedPassword) {
    const [result] = await db.execute(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = User; 