const db = require('../config/database');

class PoItem {
  static async create(itemData) {
    try {
      const {
        id_po,
        id_gudang,
        produk_data,
        qty,
        harga,
        total_harga,
        status_produksi,
        prioritas,
        target_selesai,
        catatan,
        assigned_to
      } = itemData;

      const query = `
        INSERT INTO po_items (
          id_po, id_gudang, produk_data, qty, harga, total_harga,
          status_produksi, prioritas, target_selesai, catatan, assigned_to,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const [result] = await db.execute(query, [
        id_po,
        id_gudang,
        JSON.stringify(produk_data),
        qty,
        harga,
        total_harga,
        status_produksi,
        prioritas,
        target_selesai,
        catatan,
        assigned_to
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating PO item:', error);
      throw error;
    }
  }

  static async findByPoId(poId) {
    try {
      const query = `
        SELECT 
          poi.*,
          g.nama as gudang_nama,
          u.name as assigned_user_name
        FROM po_items poi
        LEFT JOIN gudang g ON poi.id_gudang = g.id
        LEFT JOIN users u ON poi.assigned_to = u.id
        WHERE poi.id_po = ? AND poi.status_deleted = 0
        ORDER BY poi.created_at ASC
      `;

      const [rows] = await db.execute(query, [poId]);
      
      // Parse produk_data JSON
      return rows.map(row => ({
        ...row,
        produk_data: row.produk_data ? JSON.parse(row.produk_data) : null
      }));
    } catch (error) {
      console.error('Error finding PO items by PO id:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          poi.*,
          g.nama as gudang_nama,
          u.name as assigned_user_name
        FROM po_items poi
        LEFT JOIN gudang g ON poi.id_gudang = g.id
        LEFT JOIN users u ON poi.assigned_to = u.id
        WHERE poi.id = ? AND poi.status_deleted = 0
      `;

      const [rows] = await db.execute(query, [id]);
      
      if (rows.length === 0) return null;
      
      const row = rows[0];
      return {
        ...row,
        produk_data: row.produk_data ? JSON.parse(row.produk_data) : null
      };
    } catch (error) {
      console.error('Error finding PO item by id:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const {
        id_gudang,
        qty,
        harga,
        total_harga,
        status_produksi,
        prioritas,
        target_selesai,
        catatan,
        assigned_to,
        started_at,
        completed_at
      } = updateData;

      let query = `
        UPDATE po_items SET 
          id_gudang = COALESCE(?, id_gudang),
          qty = COALESCE(?, qty),
          harga = COALESCE(?, harga),
          total_harga = COALESCE(?, total_harga),
          status_produksi = COALESCE(?, status_produksi),
          prioritas = COALESCE(?, prioritas),
          target_selesai = COALESCE(?, target_selesai),
          catatan = COALESCE(?, catatan),
          assigned_to = COALESCE(?, assigned_to),
          started_at = COALESCE(?, started_at),
          completed_at = COALESCE(?, completed_at),
          updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [
        id_gudang,
        qty,
        harga,
        total_harga,
        status_produksi,
        prioritas,
        target_selesai,
        catatan,
        assigned_to,
        started_at,
        completed_at,
        id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating PO item:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `
        UPDATE po_items 
        SET status_deleted = 1, updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting PO item:', error);
      throw error;
    }
  }

  static async updateStatus(id, status, userId = null) {
    try {
      let query = `
        UPDATE po_items 
        SET status_produksi = ?, updated_at = NOW()
      `;

      const params = [status];

      // Set started_at if status is in_progress
      if (status === 'in_progress') {
        query += `, started_at = NOW()`;
      }

      // Set completed_at if status is completed
      if (status === 'completed') {
        query += `, completed_at = NOW()`;
      }

      query += ` WHERE id = ? AND status_deleted = 0`;

      const [result] = await db.execute(query, [...params, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating PO item status:', error);
      throw error;
    }
  }

  static async assignUser(id, userId) {
    try {
      const query = `
        UPDATE po_items 
        SET assigned_to = ?, updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [userId, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error assigning user to PO item:', error);
      throw error;
    }
  }

  static async getStatsByPoId(poId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status_produksi = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status_produksi = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status_produksi = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status_produksi = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM po_items 
        WHERE id_po = ? AND status_deleted = 0
      `;

      const [rows] = await db.execute(query, [poId]);
      return rows[0];
    } catch (error) {
      console.error('Error getting PO item stats:', error);
      throw error;
    }
  }

  static async bulkCreate(items) {
    try {
      const query = `
        INSERT INTO po_items (
          id_po, id_gudang, produk_data, qty, harga, total_harga,
          status_produksi, prioritas, target_selesai, catatan, assigned_to,
          created_at, updated_at
        ) VALUES ?
      `;

      const values = items.map(item => [
        item.id_po,
        item.id_gudang,
        JSON.stringify(item.produk_data),
        item.qty,
        item.harga,
        item.total_harga,
        item.status_produksi,
        item.prioritas,
        item.target_selesai,
        item.catatan,
        item.assigned_to,
        new Date(),
        new Date()
      ]);

      const [result] = await db.execute(query, [values]);
      return result.insertId;
    } catch (error) {
      console.error('Error bulk creating PO items:', error);
      throw error;
    }
  }

  static async deleteByPoId(poId) {
    try {
      const query = `
        UPDATE po_items 
        SET status_deleted = 1, updated_at = NOW()
        WHERE id_po = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [poId]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting PO items by PO id:', error);
      throw error;
    }
  }
}

module.exports = PoItem; 