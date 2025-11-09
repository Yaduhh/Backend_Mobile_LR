const db = require('../config/database');

class FilePurchaseInput {
  // Create file record
  static async create(fileData) {
    try {
      const {
        id_purchase_order,
        id_client,
        file_path,
        original_filename,
        file_size,
        mime_type,
        created_by
      } = fileData;

      const [result] = await db.execute(
        `INSERT INTO file_purchase_input 
         (id_purchase_order, id_client, file_path, original_filename, file_size, mime_type, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_purchase_order, id_client, file_path, original_filename, file_size, mime_type, created_by]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating file purchase input:', error);
      throw error;
    }
  }

  // Bulk create file records
  static async bulkCreate(filesData) {
    try {
      if (filesData.length === 0) return [];

      const values = filesData.map(file => [
        file.id_purchase_order,
        file.id_client,
        file.file_path,
        file.original_filename,
        file.file_size,
        file.mime_type,
        file.created_by
      ]);

      const placeholders = filesData.map(() => '(?, ?, ?, ?, ?, ?, ?)').join(', ');
      
      const [result] = await db.execute(
        `INSERT INTO file_purchase_input 
         (id_purchase_order, id_client, file_path, original_filename, file_size, mime_type, created_by) 
         VALUES ${placeholders}`,
        values.flat()
      );

      return result.insertId;
    } catch (error) {
      console.error('Error bulk creating file purchase input:', error);
      throw error;
    }
  }

  // Get files by purchase order ID
  static async findByPurchaseOrderId(id_purchase_order) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM file_purchase_input 
         WHERE id_purchase_order = ? AND status_deleted = 0 
         ORDER BY created_at DESC`,
        [id_purchase_order]
      );

      return rows;
    } catch (error) {
      console.error('Error finding files by purchase order ID:', error);
      throw error;
    }
  }

  // Get file by ID
  static async findById(id) {
    try {
      const [rows] = await db.execute(
        `SELECT * FROM file_purchase_input 
         WHERE id = ? AND status_deleted = 0`,
        [id]
      );

      return rows[0] || null;
    } catch (error) {
      console.error('Error finding file by ID:', error);
      throw error;
    }
  }

  // Update file
  static async update(id, updateData) {
    try {
      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      
      const setClause = fields.map(field => `${field} = ?`).join(', ');
      
      const [result] = await db.execute(
        `UPDATE file_purchase_input 
         SET ${setClause}, updated_at = NOW() 
         WHERE id = ?`,
        [...values, id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating file:', error);
      throw error;
    }
  }

  // Soft delete file
  static async softDelete(id) {
    try {
      const [result] = await db.execute(
        `UPDATE file_purchase_input 
         SET status_deleted = 1, updated_at = NOW() 
         WHERE id = ?`,
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error soft deleting file:', error);
      throw error;
    }
  }

  // Hard delete file
  static async delete(id) {
    try {
      const [result] = await db.execute(
        `DELETE FROM file_purchase_input WHERE id = ?`,
        [id]
      );

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  // Delete files by purchase order ID
  static async deleteByPurchaseOrderId(id_purchase_order) {
    try {
      const [result] = await db.execute(
        `UPDATE file_purchase_input 
         SET status_deleted = 1, updated_at = NOW() 
         WHERE id_purchase_order = ?`,
        [id_purchase_order]
      );

      return result.affectedRows;
    } catch (error) {
      console.error('Error deleting files by purchase order ID:', error);
      throw error;
    }
  }
}

module.exports = FilePurchaseInput;
