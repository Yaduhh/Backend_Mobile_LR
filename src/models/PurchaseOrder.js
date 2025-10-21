const db = require('../config/database');

class PurchaseOrder {
  static async create(purchaseOrderData) {
    try {
      const {
        id_penawaran,
        nomor_po,
        tanggal_po,
        gudang_utama,
        status_po,
        prioritas,
        catatan,
        target_selesai,
        created_by
      } = purchaseOrderData;

      const query = `
        INSERT INTO purchase_orders (
          id_penawaran, nomor_po, tanggal_po, gudang_utama, 
          status_po, prioritas, catatan, target_selesai, created_by, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      const [result] = await db.execute(query, [
        id_penawaran,
        nomor_po,
        tanggal_po,
        gudang_utama,
        status_po,
        prioritas,
        catatan || null,
        target_selesai || null,
        created_by
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const query = `
        SELECT 
          po.*,
          p.judul_penawaran,
          p.nomor_penawaran,
          p.json_produk,
          c.nama as client_nama,
          c.alamat as client_alamat,
          c.notelp as client_telepon,
          g.nama as gudang_nama,
          u1.name as creator_name,
          u2.name as approver_name,
          u3.name as canceller_name,
          (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0) as total_items,
          (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0 AND (status_produksi = 'completed' OR status_produksi = 'selesai' OR status_produksi = 'done' OR status_produksi = 'finished')) as completed_items,
          CASE 
            WHEN (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0) = 0 THEN 0
            ELSE ROUND(
              (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0 AND (status_produksi = 'completed' OR status_produksi = 'selesai' OR status_produksi = 'done' OR status_produksi = 'finished')) * 100.0 / 
              (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0)
            )
          END as progress_percentage
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        LEFT JOIN users u1 ON po.created_by = u1.id
        LEFT JOIN users u2 ON po.approved_by = u2.id
        LEFT JOIN users u3 ON po.cancelled_by = u3.id
        WHERE po.id = ? AND po.status_deleted = 0
      `;

      const [rows] = await db.execute(query, [id]);
      return rows[0];
    } catch (error) {
      console.error('Error finding purchase order by id:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          po.*,
          p.judul_penawaran,
          p.nomor_penawaran,
          c.nama as client_nama,
          g.nama as gudang_nama,
          u1.name as creator_name,
          u2.name as approver_name,
          u3.name as canceller_name,
          (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0) as total_items,
          (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0 AND (status_produksi = 'completed' OR status_produksi = 'selesai' OR status_produksi = 'done' OR status_produksi = 'finished')) as completed_items,
          CASE 
            WHEN (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0) = 0 THEN 0
            ELSE ROUND(
              (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0 AND (status_produksi = 'completed' OR status_produksi = 'selesai' OR status_produksi = 'done' OR status_produksi = 'finished')) * 100.0 / 
              (SELECT COUNT(*) FROM po_items WHERE id_po = po.id AND status_deleted = 0)
            )
          END as progress_percentage
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        LEFT JOIN users u1 ON po.created_by = u1.id
        LEFT JOIN users u2 ON po.approved_by = u2.id
        LEFT JOIN users u3 ON po.cancelled_by = u3.id
        WHERE po.status_deleted = 0 AND p.id_user = ?
      `;

      const params = [userId];

      // Add filters
      if (filters.search) {
        query += ` AND (po.nomor_po LIKE ? OR c.nama LIKE ? OR g.nama LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.status) {
        query += ` AND po.status_po = ?`;
        params.push(filters.status);
      }

      if (filters.gudang) {
        query += ` AND po.gudang_utama = ?`;
        params.push(filters.gudang);
      }

      query += ` ORDER BY po.created_at DESC`;

      // Add pagination
      if (filters.limit) {
        query += ` LIMIT ?`;
        params.push(parseInt(filters.limit));
      }

      if (filters.offset) {
        query += ` OFFSET ?`;
        params.push(parseInt(filters.offset));
      }

      const [rows] = await db.execute(query, params);
      return rows;
    } catch (error) {
      console.error('Error finding purchase orders by user id:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const {
        gudang_utama,
        status_po,
        prioritas,
        catatan,
        target_selesai,
        approved_by,
        approved_at,
        cancelled_by,
        cancelled_at
      } = updateData;

      let query = `
        UPDATE purchase_orders SET 
          gudang_utama = COALESCE(?, gudang_utama),
          status_po = COALESCE(?, status_po),
          prioritas = COALESCE(?, prioritas),
          catatan = COALESCE(?, catatan),
          target_selesai = COALESCE(?, target_selesai),
          approved_by = COALESCE(?, approved_by),
          approved_at = COALESCE(?, approved_at),
          cancelled_by = COALESCE(?, cancelled_by),
          cancelled_at = COALESCE(?, cancelled_at),
          updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [
        gudang_utama,
        status_po,
        prioritas,
        catatan,
        target_selesai,
        approved_by,
        approved_at,
        cancelled_by,
        cancelled_at,
        id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating purchase order:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `
        UPDATE purchase_orders 
        SET status_deleted = 1, updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting purchase order:', error);
      throw error;
    }
  }

  static async generateNomorPO() {
    try {
      const query = `
        SELECT nomor_po 
        FROM purchase_orders 
        WHERE status_deleted = 0 
        ORDER BY id DESC 
        LIMIT 1
      `;

      const [rows] = await db.execute(query);
      
      let lastNumber = 0;
      if (rows.length > 0) {
        const lastPO = rows[0].nomor_po;
        const match = lastPO.match(/^(\d+)\/PO\/MKI\//);
        if (match) {
          lastNumber = parseInt(match[1]);
        }
      }

      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      const number = lastNumber + 1;
      
      return `${number.toString().padStart(3, '0')}/PO/MKI/${month.toString().padStart(2, '0')}/${year}`;
    } catch (error) {
      console.error('Error generating nomor PO:', error);
      throw error;
    }
  }

  static async getStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN po.status_po = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN po.status_po = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN po.status_po = 'in_production' THEN 1 ELSE 0 END) as in_production,
          SUM(CASE WHEN po.status_po = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN po.status_po = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
          SUM(CASE WHEN po.prioritas = 'urgent' THEN 1 ELSE 0 END) as urgent
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.status_deleted = 0 AND p.id_user = ?
      `;

      const [rows] = await db.execute(query, [userId]);
      return rows[0];
    } catch (error) {
      console.error('Error getting purchase order stats:', error);
      throw error;
    }
  }

  static async approve(id, userId) {
    try {
      const query = `
        UPDATE purchase_orders 
        SET status_po = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW()
        WHERE id = ? AND status_po = 'draft' AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [userId, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error approving purchase order:', error);
      throw error;
    }
  }

  static async startProduction(id) {
    try {
      const query = `
        UPDATE purchase_orders 
        SET status_po = 'in_production', updated_at = NOW()
        WHERE id = ? AND status_po = 'approved' AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error starting production:', error);
      throw error;
    }
  }

  static async completeProduction(id) {
    try {
      const query = `
        UPDATE purchase_orders 
        SET status_po = 'completed', updated_at = NOW()
        WHERE id = ? AND status_po = 'in_production' AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error completing production:', error);
      throw error;
    }
  }

  static async cancel(id, userId) {
    try {
      const query = `
        UPDATE purchase_orders 
        SET status_po = 'cancelled', cancelled_by = ?, cancelled_at = NOW(), updated_at = NOW()
        WHERE id = ? AND status_po NOT IN ('completed', 'cancelled') AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [userId, id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      throw error;
    }
  }

  static async reactivate(id) {
    try {
      const query = `
        UPDATE purchase_orders 
        SET status_po = 'draft', cancelled_by = NULL, cancelled_at = NULL, updated_at = NOW()
        WHERE id = ? AND status_po = 'cancelled' AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error reactivating purchase order:', error);
      throw error;
    }
  }

  static async findByPenawaranId(penawaranId) {
    try {
      const query = `
        SELECT * FROM purchase_orders 
        WHERE id_penawaran = ? AND status_deleted = 0
        LIMIT 1
      `;

      const [rows] = await db.execute(query, [penawaranId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error finding purchase order by penawaran id:', error);
      throw error;
    }
  }
}

module.exports = PurchaseOrder; 