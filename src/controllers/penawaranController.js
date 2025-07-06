const db = require('../config/database');

class PenawaranController {
  // Get all penawaran for sales
  async index(req, res) {
    try {
      const userId = req.user.id;
      const { search, status, bulan } = req.query;
      
      let query = `
        SELECT p.*, c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               u.name as user_name
        FROM penawaran p
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN users u ON p.id_user = u.id
        WHERE p.id_user = ? AND p.status_deleted = 0
      `;
      
      const params = [userId];
      
      // Search functionality
      if (search) {
        query += ` AND (p.nomor_penawaran LIKE ? OR p.judul_penawaran LIKE ? OR c.nama LIKE ? OR c.nama_perusahaan LIKE ?)`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      // Filter by status
      if (status !== undefined && status !== '') {
        query += ` AND p.status = ?`;
        params.push(parseInt(status));
      }
      
      // Filter by bulan
      if (bulan !== undefined && bulan !== '') {
        query += ` AND MONTH(p.tanggal_penawaran) = ?`;
        params.push(parseInt(bulan));
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [penawarans] = await db.execute(query, params);
      
      // Get stats
      let statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) as win,
          SUM(CASE WHEN status = 2 THEN 1 ELSE 0 END) as lose,
          SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status = 1 THEN grand_total ELSE 0 END) as total_nilai
        FROM penawaran 
        WHERE id_user = ? AND status_deleted = 0
      `;
      
      const statsParams = [userId];
      
      if (search) {
        statsQuery += ` AND (nomor_penawaran LIKE ? OR judul_penawaran LIKE ?)`;
        const searchParam = `%${search}%`;
        statsParams.push(searchParam, searchParam);
      }
      
      if (status !== undefined && status !== '') {
        statsQuery += ` AND status = ?`;
        statsParams.push(parseInt(status));
      }
      
      if (bulan !== undefined && bulan !== '') {
        statsQuery += ` AND MONTH(tanggal_penawaran) = ?`;
        statsParams.push(parseInt(bulan));
      }
      
      const [statsResult] = await db.execute(statsQuery, statsParams);
      const stats = statsResult[0];
      
      res.json({
        success: true,
        data: penawarans,
        stats: {
          total: stats.total || 0,
          win: stats.win || 0,
          lose: stats.lose || 0,
          draft: stats.draft || 0,
          total_nilai: stats.total_nilai || 0
        }
      });
    } catch (error) {
      console.error('Error in penawaran index:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get single penawaran
  async show(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const query = `
        SELECT p.*, c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               u.name as user_name
        FROM penawaran p
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN users u ON p.id_user = u.id
        WHERE p.id = ? AND p.id_user = ? AND p.status_deleted = 0
      `;
      
      const [penawarans] = await db.execute(query, [id, userId]);
      
      if (penawarans.length === 0) {
        return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan' });
      }
      
      const penawaran = penawarans[0];
      
      // Parse JSON fields
      if (penawaran.json_produk) {
        penawaran.json_produk = JSON.parse(penawaran.json_produk);
      }
      if (penawaran.syarat_kondisi) {
        penawaran.syarat_kondisi = JSON.parse(penawaran.syarat_kondisi);
      }
      
      res.json({ success: true, data: penawaran });
    } catch (error) {
      console.error('Error in penawaran show:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Create new penawaran
  async store(req, res) {
    try {
      const userId = req.user.id;
      const {
        id_client,
        id_gudang,
        kop_surat_id,
        project,
        judul_penawaran,
        tanggal_penawaran,
        diskon,
        diskon_satu,
        diskon_dua,
        ppn,
        total,
        json_produk,
        syarat_kondisi,
        catatan
      } = req.body;
      
      // Generate nomor penawaran
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      
      const romanMonths = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
        7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
      };
      
      const romanMonth = romanMonths[month];
      
      // Get last penawaran number for this month
      const [lastPenawaran] = await db.execute(
        'SELECT nomor_penawaran FROM penawaran WHERE kop_surat_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ? ORDER BY id DESC LIMIT 1',
        [kop_surat_id, new Date().getFullYear(), month]
      );
      
      let nextNumber = 1;
      if (lastPenawaran.length > 0) {
        const lastNumber = parseInt(lastPenawaran[0].nomor_penawaran.split('/')[0]);
        nextNumber = lastNumber + 1;
      }
      
      const nomorUrut = nextNumber < 10 ? `0${nextNumber}` : nextNumber.toString();
      const nomor_penawaran = `${nomorUrut}/${romanMonth}/SP-LRL/${year}`;
      
      // Calculate totals
      const subtotal = parseFloat(total) || 0;
      const diskonPercent = parseFloat(diskon) || 0;
      const diskonSatuPercent = parseInt(diskon_satu) || 0;
      const diskonDuaPercent = parseInt(diskon_dua) || 0;
      const ppnPercent = parseInt(ppn) || 11;
      
      const total_diskon = subtotal * (diskonPercent / 100);
      const total_diskon_1 = (subtotal - total_diskon) * (diskonSatuPercent / 100);
      const total_diskon_2 = (subtotal - total_diskon - total_diskon_1) * (diskonDuaPercent / 100);
      const total_diskon_all = total_diskon + total_diskon_1 + total_diskon_2;
      const after_diskon = subtotal - total_diskon_all;
      const ppn_nominal = after_diskon * (ppnPercent / 100);
      const grand_total = Math.round(after_diskon + ppn_nominal);
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      console.log('Current time for created_at/updated_at:', currentTime);
      
      const insertQuery = `
        INSERT INTO penawaran (
          id_user, id_client, id_gudang, kop_surat_id, project, nomor_penawaran,
          tanggal_penawaran, judul_penawaran, diskon, diskon_satu, diskon_dua,
          ppn, total, total_diskon, total_diskon_1, total_diskon_2, grand_total,
          json_produk, syarat_kondisi, catatan, status, status_deleted, created_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `;
      
      const insertParams = [
        userId, id_client, id_gudang, kop_surat_id, project, nomor_penawaran,
        tanggal_penawaran, judul_penawaran, diskonPercent, diskonSatuPercent, diskonDuaPercent,
        ppnPercent, subtotal, total_diskon, total_diskon_1, total_diskon_2, grand_total,
        JSON.stringify(json_produk || []), JSON.stringify(syarat_kondisi || []), catatan, userId,
        currentTime, currentTime
      ];
      
      console.log('Insert params:', insertParams);
      console.log('Insert query:', insertQuery);
      
      const [result] = await db.execute(insertQuery, insertParams);
      
      console.log('Insert result:', result);
      
      res.json({
        success: true,
        message: 'Penawaran berhasil dibuat',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error in penawaran store:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update penawaran
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        id_client,
        id_gudang,
        kop_surat_id,
        project,
        judul_penawaran,
        tanggal_penawaran,
        diskon,
        diskon_satu,
        diskon_dua,
        ppn,
        total,
        json_produk,
        syarat_kondisi,
        catatan
      } = req.body;
      
      // Check if penawaran exists and belongs to user
      const [existing] = await db.execute(
        'SELECT id FROM penawaran WHERE id = ? AND id_user = ? AND status_deleted = 0',
        [id, userId]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan' });
      }
      
      // Calculate totals
      const subtotal = parseFloat(total) || 0;
      const diskonPercent = parseFloat(diskon) || 0;
      const diskonSatuPercent = parseInt(diskon_satu) || 0;
      const diskonDuaPercent = parseInt(diskon_dua) || 0;
      const ppnPercent = parseInt(ppn) || 11;
      
      const total_diskon = subtotal * (diskonPercent / 100);
      const total_diskon_1 = (subtotal - total_diskon) * (diskonSatuPercent / 100);
      const total_diskon_2 = (subtotal - total_diskon - total_diskon_1) * (diskonDuaPercent / 100);
      const total_diskon_all = total_diskon + total_diskon_1 + total_diskon_2;
      const after_diskon = subtotal - total_diskon_all;
      const ppn_nominal = after_diskon * (ppnPercent / 100);
      const grand_total = Math.round(after_diskon + ppn_nominal);
      
      // Get current time with +7 hours (WIB) for update
      const updateNow = new Date();
      updateNow.setHours(updateNow.getHours() + 7);
      const updateTime = updateNow.toISOString().slice(0, 19).replace('T', ' ');
      
      const updateQuery = `
        UPDATE penawaran SET
          id_client = ?, id_gudang = ?, kop_surat_id = ?, project = ?,
          judul_penawaran = ?, tanggal_penawaran = ?, diskon = ?, diskon_satu = ?,
          diskon_dua = ?, ppn = ?, total = ?, total_diskon = ?, total_diskon_1 = ?,
          total_diskon_2 = ?, grand_total = ?, json_produk = ?, syarat_kondisi = ?,
          catatan = ?, updated_at = ?
        WHERE id = ? AND id_user = ?
      `;
      
      const updateParams = [
        id_client, id_gudang, kop_surat_id, project, judul_penawaran, tanggal_penawaran,
        diskonPercent, diskonSatuPercent, diskonDuaPercent, ppnPercent, subtotal,
        total_diskon, total_diskon_1, total_diskon_2, grand_total,
        JSON.stringify(json_produk || []), JSON.stringify(syarat_kondisi || []), catatan,
        updateTime, id, userId
      ];
      
      await db.execute(updateQuery, updateParams);
      
      res.json({
        success: true,
        message: 'Penawaran berhasil diupdate'
      });
    } catch (error) {
      console.error('Error in penawaran update:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Delete penawaran (soft delete)
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const [result] = await db.execute(
        'UPDATE penawaran SET status_deleted = 1 WHERE id = ? AND id_user = ?',
        [id, userId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan' });
      }
      
      res.json({
        success: true,
        message: 'Penawaran berhasil dihapus'
      });
    } catch (error) {
      console.error('Error in penawaran destroy:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update status penawaran
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user.id;
      
      if (![0, 1, 2].includes(parseInt(status))) {
        return res.status(400).json({ success: false, message: 'Status tidak valid' });
      }
      
      const [result] = await db.execute(
        'UPDATE penawaran SET status = ? WHERE id = ? AND id_user = ?',
        [status, id, userId]
      );
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan' });
      }
      
      const statusText = status == 0 ? 'Draft' : status == 1 ? 'WIN' : 'LOSE';
      
      res.json({
        success: true,
        message: `Penawaran berhasil ditandai sebagai ${statusText}`
      });
    } catch (error) {
      console.error('Error in penawaran updateStatus:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get clients by sales
  async getClientsBySales(req, res) {
    try {
      const userId = req.user.id;
      
      const [clients] = await db.execute(
        'SELECT id, nama, nama_perusahaan FROM clients WHERE created_by = ? AND status_deleted = 0',
        [userId]
      );
      
      res.json({ success: true, data: clients });
    } catch (error) {
      console.error('Error in getClientsBySales:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get PVC Pipa Standard AW products
  async getPvcPipaStandardAw(req, res) {
    try {
      const [products] = await db.execute(
        'SELECT id, nama, slug, mm, inch, price FROM pvc_pipa_standard_aw WHERE status_deleted = 0 ORDER BY mm, inch'
      );
      res.json({ success: true, data: products });
    } catch (error) {
      console.error('Error in getPvcPipaStandardAw:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get PVC Pipa Standard D products
  async getPvcPipaStandardD(req, res) {
    try {
      const [products] = await db.execute(
        'SELECT id, nama, slug, mm, inch, price FROM pvc_pipa_standard_d WHERE status_deleted = 0 ORDER BY mm, inch'
      );
      res.json({ success: true, data: products });
    } catch (error) {
      console.error('Error in getPvcPipaStandardD:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get syarat ketentuan
  async getSyaratKetentuan(req, res) {
    try {
      console.log('Fetching syarat ketentuan from database...');
      const [syarat] = await db.execute(
        'SELECT id, syarat FROM syarat_ketentuan WHERE status_deleted = false ORDER BY id'
      );
      console.log('Syarat ketentuan result:', syarat);
      res.json({ success: true, data: syarat });
    } catch (error) {
      console.error('Error in getSyaratKetentuan:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get gudang
  async getGudang(req, res) {
    try {
      const [gudang] = await db.execute(
        'SELECT id, nama, lokasi, telp, fax, email, penanggung_jawab, deskripsi FROM gudang WHERE status_deleted = 0 ORDER BY nama'
      );
      res.json({ success: true, data: gudang });
    } catch (error) {
      console.error('Error in getGudang:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get kop surat
  async getKopSurat(req, res) {
    try {
      const [kopSurat] = await db.execute(
        'SELECT id, title_header, alamat, notelp, fax, email, format_surat FROM kop_surat WHERE status_deleted = 0 ORDER BY title_header'
      );
      res.json({ success: true, data: kopSurat });
    } catch (error) {
      console.error('Error in getKopSurat:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new PenawaranController(); 