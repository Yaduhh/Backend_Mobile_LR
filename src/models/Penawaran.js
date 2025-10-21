const db = require('../config/database');

class Penawaran {
  static async findById(id) {
    try {
      const query = `
        SELECT 
          p.*,
          c.nama as client_nama,
          c.alamat as client_alamat,
          g.nama as gudang_nama,
          u.name as user_name
        FROM penawaran p
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN gudang g ON p.id_gudang = g.id
        LEFT JOIN users u ON p.id_user = u.id
        WHERE p.id = ? AND p.status_deleted = 0
      `;

      const [rows] = await db.execute(query, [id]);
      return rows[0];
    } catch (error) {
      console.error('Error finding penawaran by id:', error);
      throw error;
    }
  }

  static async findByUserId(userId, filters = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          c.nama as client_nama,
          g.nama as gudang_nama,
          u.name as user_name
        FROM penawaran p
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN gudang g ON p.id_gudang = g.id
        LEFT JOIN users u ON p.id_user = u.id
        WHERE p.status_deleted = 0 AND p.id_user = ?
      `;

      const params = [userId];

      // Add filters
      if (filters.search) {
        query += ` AND (p.nomor_penawaran LIKE ? OR p.judul_penawaran LIKE ? OR c.nama LIKE ?)`;
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (filters.status !== undefined) {
        query += ` AND p.status = ?`;
        params.push(filters.status);
      }

      if (filters.client) {
        query += ` AND p.id_client = ?`;
        params.push(filters.client);
      }

      query += ` ORDER BY p.created_at DESC`;

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
      console.error('Error finding penawaran by user id:', error);
      throw error;
    }
  }

  static async update(id, updateData) {
    try {
      const {
        judul_penawaran,
        nomor_penawaran,
        tanggal_penawaran,
        id_client,
        id_gudang,
        json_produk,
        total,
        diskon,
        total_diskon,
        diskon_satu,
        total_diskon_1,
        diskon_dua,
        total_diskon_2,
        ppn,
        grand_total,
        syarat_kondisi,
        status
      } = updateData;

      let query = `
        UPDATE penawaran SET 
          judul_penawaran = COALESCE(?, judul_penawaran),
          nomor_penawaran = COALESCE(?, nomor_penawaran),
          tanggal_penawaran = COALESCE(?, tanggal_penawaran),
          id_client = COALESCE(?, id_client),
          id_gudang = COALESCE(?, id_gudang),
          json_produk = COALESCE(?, json_produk),
          total = COALESCE(?, total),
          diskon = COALESCE(?, diskon),
          total_diskon = COALESCE(?, total_diskon),
          diskon_satu = COALESCE(?, diskon_satu),
          total_diskon_1 = COALESCE(?, total_diskon_1),
          diskon_dua = COALESCE(?, diskon_dua),
          total_diskon_2 = COALESCE(?, total_diskon_2),
          ppn = COALESCE(?, ppn),
          grand_total = COALESCE(?, grand_total),
          syarat_kondisi = COALESCE(?, syarat_kondisi),
          status = COALESCE(?, status),
          updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [
        judul_penawaran,
        nomor_penawaran,
        tanggal_penawaran,
        id_client,
        id_gudang,
        json_produk ? JSON.stringify(json_produk) : null,
        total,
        diskon,
        total_diskon,
        diskon_satu,
        total_diskon_1,
        diskon_dua,
        total_diskon_2,
        ppn,
        grand_total,
        syarat_kondisi ? JSON.stringify(syarat_kondisi) : null,
        status,
        id
      ]);

      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error updating penawaran:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const query = `
        UPDATE penawaran 
        SET status_deleted = 1, updated_at = NOW()
        WHERE id = ? AND status_deleted = 0
      `;

      const [result] = await db.execute(query, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting penawaran:', error);
      throw error;
    }
  }

  static async getStats(userId) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as win,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as lose
        FROM penawaran 
        WHERE status_deleted = 0 AND id_user = ?
      `;

      const [rows] = await db.execute(query, [userId]);
      return rows[0];
    } catch (error) {
      console.error('Error getting penawaran stats:', error);
      throw error;
    }
  }
}

module.exports = Penawaran; 