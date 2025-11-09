const db = require('../config/database');

// Helper function to query category products (outside class)
// isPipa: true untuk Pipa (field: diameter), false untuk Fitting (field: size)
async function queryCategoryProducts(kategoriTable, produkTable, isPipa = true) {
  const sizeField = isPipa ? 'diameter' : 'size';
  const [results] = await db.execute(
    `SELECT k.id as kategori_id, k.nama_kategori as kategori_nama, 
            p.id, p.nama_produk as nama, p.${sizeField} as mm, p.${sizeField} as dn, p.harga as price, p.satuan 
     FROM ${kategoriTable} k 
     LEFT JOIN ${produkTable} p ON k.id = p.kategori_id 
     ORDER BY k.nama_kategori, p.${sizeField}`
  );
  return results;
}

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
        SELECT p.*, 
               c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               c.alamat as alamat_client, c.notelp as no_telp_client, c.email as email_client,
               u.name as user_name,
               g.nama as gudang_nama,
               k.title_header as kop_surat_title, k.alamat as kop_surat_alamat,
               k.notelp as kop_surat_notelp, k.fax as kop_surat_fax,
               k.email as kop_surat_email, k.logo as kop_surat_logo,
               (SELECT file_ttd FROM user_tanda_tangan WHERE user_id = u.id AND kop_surat_id = p.kop_surat_id AND status_aktif = 1 AND status_deleted = 0 LIMIT 1) as user_ttd
        FROM penawaran p
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN users u ON p.id_user = u.id
        LEFT JOIN gudang g ON p.id_gudang = g.id
        LEFT JOIN kop_surat k ON p.kop_surat_id = k.id
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
      
      // Build kop_surat object
      penawaran.kop_surat = {
        title_header: penawaran.kop_surat_title,
        alamat: penawaran.kop_surat_alamat,
        notelp: penawaran.kop_surat_notelp,
        fax: penawaran.kop_surat_fax,
        email: penawaran.kop_surat_email,
        logo: penawaran.kop_surat_logo
      };
      
      // Remove redundant fields
      delete penawaran.kop_surat_title;
      delete penawaran.kop_surat_alamat;
      delete penawaran.kop_surat_notelp;
      delete penawaran.kop_surat_fax;
      delete penawaran.kop_surat_email;
      delete penawaran.kop_surat_logo;
      
      // Convert TINYINT (1/0) to boolean for checkboxes
      penawaran.status_ppn = penawaran.status_ppn === 1 ? true : false;
      penawaran.status_diskon_produk = penawaran.status_diskon_produk === 1 ? true : false;
      penawaran.diskon_cetak = penawaran.diskon_cetak === 1 ? true : false;
      
      // Get Purchase Order data if exists
      const [poData] = await db.execute(`
        SELECT po.*, g.nama as gudang_nama
        FROM purchase_orders po
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        WHERE po.id_penawaran = ? AND po.status_deleted = 0
      `, [id]);
      
      if (poData.length > 0) {
        const po = poData[0];
        
        // Get Surat Jalan data for this PO
        const [suratJalanData] = await db.execute(`
          SELECT sj.*
          FROM surat_jalan sj
          WHERE sj.purchase_order_id = ? AND sj.deleted_status = 0
          ORDER BY sj.created_at DESC
        `, [po.id]);
        
        penawaran.purchase_order = {
          id: po.id,
          nomor_po: po.nomor_po,
          tanggal_po: po.tanggal_po,
          status_po: po.status_po,
          prioritas: po.prioritas,
          catatan: po.catatan,
          target_selesai: po.target_selesai,
          gudang_nama: po.gudang_nama,
          created_at: po.created_at,
          updated_at: po.updated_at,
          surat_jalan: suratJalanData
        };
      }
      
      console.log('Response checkboxes:', {
        status_ppn: penawaran.status_ppn,
        status_diskon_produk: penawaran.status_diskon_produk,
        diskon_cetak: penawaran.diskon_cetak
      });
      
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
        kop_surat_id,
        project,
        judul_penawaran,
        tanggal_penawaran,
        status_ppn,
        status_diskon_produk,
        diskon_cetak,
        diskon,
        diskon_satu,
        diskon_dua,
        ppn,
        total,
        json_produk,
        syarat_kondisi,
        catatan,
        masa_berlaku_minggu,
        waktu_delivery_hari,
        pembayaran_tempo_hari,
        syarat_tempo,
        tempo_hari,
        syarat_cbd,
        syarat_dp,
        dp_persen
      } = req.body;
      
      // Debug json_produk yang diterima
      console.log('🔍 Received json_produk:', JSON.stringify(json_produk, null, 2));
      console.log('🔍 Type of json_produk:', typeof json_produk);
      
      // Get kop surat untuk format_surat, nomor_bank, title_header
      const [kopSurat] = await db.execute(
        'SELECT format_surat, nomor_bank, title_header FROM kop_surat WHERE id = ?',
        [kop_surat_id]
      );
      
      if (!kopSurat || kopSurat.length === 0) {
        return res.status(400).json({ success: false, message: 'Kop surat tidak ditemukan' });
      }
      
      const formatSurat = kopSurat[0].format_surat || 'LRL';
      
      // Generate nomor penawaran
      const month = new Date().getMonth() + 1;
      const year = new Date().getFullYear().toString().slice(-2);
      
      const romanMonths = {
        1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
        7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
      };
      
      const romanMonth = romanMonths[month];
      
      // Get last penawaran number for this month (termasuk yang deleted)
      const [lastPenawaran] = await db.execute(
        'SELECT nomor_penawaran FROM penawaran WHERE kop_surat_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ? ORDER BY id DESC LIMIT 1',
        [kop_surat_id, new Date().getFullYear(), month]
      );
      
      let nextNumber = 1;
      if (lastPenawaran.length > 0) {
        const lastNumber = parseInt(lastPenawaran[0].nomor_penawaran.split('/')[0]);
        nextNumber = lastNumber + 1;
      }
      
      // Format nomor urut: 2 digit untuk < 10, 3 digit untuk >= 10 (SAMA KAYAK WEB)
      let nomorUrut;
      if (nextNumber < 10) {
        nomorUrut = nextNumber.toString().padStart(2, '0');
      } else {
        nomorUrut = nextNumber.toString().padStart(3, '0');
      }
      
      const nomor_penawaran = `${nomorUrut}/${romanMonth}/SP-${formatSurat}/${year}`;
      
      // Process syarat_kondisi - Tambah custom syarat (SAMA KAYAK WEB)
      let processedSyaratKondisi = [];
      
      // 1. Masa berlaku penawaran
      if (masa_berlaku_minggu) {
        processedSyaratKondisi.push(`Masa berlaku penawaran ${masa_berlaku_minggu} minggu`);
      }
      
      // 2. Waktu delivery
      if (waktu_delivery_hari) {
        processedSyaratKondisi.push(`Waktu delivery ${waktu_delivery_hari} hari dari PO diterima`);
      }
      
      // 3. Pembayaran tempo (dengan nomor rekening dari kop surat)
      if (pembayaran_tempo_hari) {
        const nomorRekening = kopSurat[0].nomor_bank || 'BCA 549 528 7979';
        const namaPerusahaan = kopSurat[0].title_header || 'PT LAUTAN REJEKI LUAS';
        processedSyaratKondisi.push(`Pembayaran tempo ${pembayaran_tempo_hari} hari dari invoice ${nomorRekening} a/n. ${namaPerusahaan}`);
      }
      
      // 4. Process syarat dari checkbox/database
      if (syarat_kondisi && Array.isArray(syarat_kondisi)) {
        syarat_kondisi.forEach(syarat => {
          // Skip kalau value nya boolean field names
          if (typeof syarat === 'string') {
            processedSyaratKondisi.push(syarat);
          }
        });
      }
      
      // 5. Tambah syarat khusus dari boolean flags
      if (syarat_tempo && tempo_hari) {
        processedSyaratKondisi.push(`Tempo ${tempo_hari} Hari`);
      }
      
      if (syarat_cbd) {
        processedSyaratKondisi.push('CBD (Cash Before Delivery)');
      }
      
      if (syarat_dp && dp_persen) {
        // Calculate DP amount (will be calculated after grand_total)
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
      
      // Add DP syarat if applicable (after grand_total calculated)
      if (syarat_dp && dp_persen) {
        const dpNominal = (grand_total * dp_persen) / 100;
        const dpFormatted = 'Rp ' + new Intl.NumberFormat('id-ID').format(dpNominal);
        processedSyaratKondisi.push(`DP ${dp_persen}% Dan sisanya dibayarkan setelah barang dikirim. Total DP ${dpFormatted}`);
      }
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      console.log('Current time for created_at/updated_at:', currentTime);
      
      const insertQuery = `
        INSERT INTO penawaran (
          id_user, id_client, kop_surat_id, project, nomor_penawaran,
          tanggal_penawaran, judul_penawaran, 
          status_ppn, status_diskon_produk, diskon_cetak,
          diskon, diskon_satu, diskon_dua, ppn, 
          total, total_diskon, total_diskon_1, total_diskon_2, grand_total,
          json_produk, syarat_kondisi, catatan, 
          status, status_deleted, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
      `;
      
      // Debug checkbox values
      console.log('Checkbox values received:', {
        status_ppn,
        status_diskon_produk,
        diskon_cetak,
        types: {
          status_ppn: typeof status_ppn,
          status_diskon_produk: typeof status_diskon_produk,
          diskon_cetak: typeof diskon_cetak
        }
      });
      
      // Convert to TINYINT (1/0) - handle both boolean and truthy values
      const statusPpnValue = status_ppn === true || status_ppn === 1 || status_ppn === '1' ? 1 : 0;
      const statusDiskonProdukValue = status_diskon_produk === true || status_diskon_produk === 1 || status_diskon_produk === '1' ? 1 : 0;
      const diskonCetakValue = diskon_cetak === true || diskon_cetak === 1 || diskon_cetak === '1' ? 1 : 0;
      
      console.log('Converted to DB values:', {
        statusPpnValue,
        statusDiskonProdukValue,
        diskonCetakValue
      });
      
      const insertParams = [
        userId, id_client, kop_surat_id, project, nomor_penawaran,
        tanggal_penawaran, judul_penawaran,
        statusPpnValue, statusDiskonProdukValue, diskonCetakValue,
        diskonPercent, diskonSatuPercent, diskonDuaPercent, ppnPercent,
        subtotal, total_diskon, total_diskon_1, total_diskon_2, grand_total,
        JSON.stringify(json_produk || {}), JSON.stringify(processedSyaratKondisi), catatan,
        userId, currentTime, currentTime
      ];
      
      console.log('Insert params:', insertParams);
      console.log('Insert query:', insertQuery);
      console.log('🔍 json_produk before JSON.stringify:', json_produk);
      console.log('🔍 JSON.stringify result:', JSON.stringify(json_produk || {}));
      
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

  // Update penawaran (SAMA PERSIS KAYAK WEB)
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        id_client,
        kop_surat_id,
        project,
        judul_penawaran,
        tanggal_penawaran,
        status_ppn,
        status_diskon_produk,
        diskon_cetak,
        diskon,
        diskon_satu,
        diskon_dua,
        ppn,
        total,
        json_produk,
        syarat_kondisi,
        catatan,
        // Syarat & Ketentuan fields
        masa_berlaku_minggu,
        waktu_delivery_hari,
        pembayaran_tempo_hari,
        syarat_tempo,
        tempo_hari,
        syarat_cbd,
        syarat_dp,
        dp_persen,
      } = req.body;
      
      // Debug json_produk yang diterima untuk UPDATE
      console.log('🔍 UPDATE - Received json_produk:', JSON.stringify(json_produk, null, 2));
      console.log('🔍 UPDATE - Type of json_produk:', typeof json_produk);
      
      // Check if penawaran exists and belongs to user
      const [existing] = await db.execute(
        'SELECT id FROM penawaran WHERE id = ? AND id_user = ? AND status_deleted = 0',
        [id, userId]
      );
      
      if (existing.length === 0) {
        return res.status(404).json({ success: false, message: 'Penawaran tidak ditemukan' });
      }
      
      // Fetch kop surat untuk nomor rekening
      const [kopSurat] = await db.execute('SELECT * FROM kop_surat WHERE id = ?', [kop_surat_id]);
      
      // Process syarat_kondisi - SAMA KAYAK WEB
      let processedSyaratKondisi = [];
      
      // 1. Masa berlaku penawaran
      if (masa_berlaku_minggu) {
        processedSyaratKondisi.push(`Masa berlaku penawaran ${masa_berlaku_minggu} minggu`);
      }
      
      // 2. Waktu delivery
      if (waktu_delivery_hari) {
        processedSyaratKondisi.push(`Waktu delivery ${waktu_delivery_hari} hari dari PO diterima`);
      }
      
      // 3. Pembayaran tempo (dengan nomor rekening dari kop surat)
      if (pembayaran_tempo_hari && kopSurat.length > 0) {
        const nomorRekening = kopSurat[0].nomor_bank || 'BCA 549 528 7979';
        const namaPerusahaan = kopSurat[0].title_header || 'PT LAUTAN REJEKI LUAS';
        processedSyaratKondisi.push(`Pembayaran tempo ${pembayaran_tempo_hari} hari dari invoice ${nomorRekening} a/n. ${namaPerusahaan}`);
      }
      
      // 4. Process syarat dari checkbox/database
      if (syarat_kondisi && Array.isArray(syarat_kondisi)) {
        syarat_kondisi.forEach(syarat => {
          // Skip kalau value nya boolean field names
          if (typeof syarat === 'string') {
            processedSyaratKondisi.push(syarat);
          }
        });
      }
      
      // 5. Calculate totals dulu untuk DP
      const subtotal = parseFloat(total) || 0;
      const diskonPercent = parseFloat(diskon) || 0;
      const diskonSatuPercent = parseFloat(diskon_satu) || 0;
      const diskonDuaPercent = parseFloat(diskon_dua) || 0;
      const ppnPercent = parseFloat(ppn) || 11;
      
      const total_diskon = subtotal * (diskonPercent / 100);
      const total_diskon_1 = (subtotal - total_diskon) * (diskonSatuPercent / 100);
      const total_diskon_2 = (subtotal - total_diskon - total_diskon_1) * (diskonDuaPercent / 100);
      const total_diskon_all = total_diskon + total_diskon_1 + total_diskon_2;
      const after_diskon = subtotal - total_diskon_all;
      const ppn_nominal = after_diskon * (ppnPercent / 100);
      const grand_total = Math.round(after_diskon + ppn_nominal);
      
      // 6. Tambah syarat khusus dari boolean flags
      if (syarat_tempo && tempo_hari) {
        processedSyaratKondisi.push(`Tempo ${tempo_hari} Hari`);
      }
      
      if (syarat_cbd) {
        processedSyaratKondisi.push('CBD (Cash Before Delivery)');
      }
      
      if (syarat_dp && dp_persen) {
        const dpNominal = (grand_total * dp_persen) / 100;
        const dpFormatted = 'Rp ' + new Intl.NumberFormat('id-ID').format(dpNominal);
        processedSyaratKondisi.push(`DP ${dp_persen}% Dan sisanya dibayarkan setelah barang dikirim. Total DP ${dpFormatted}`);
      }
      
      // Get current time with +7 hours (WIB) for update
      const updateNow = new Date();
      updateNow.setHours(updateNow.getHours() + 7);
      const updateTime = updateNow.toISOString().slice(0, 19).replace('T', ' ');
      
      const updateQuery = `
        UPDATE penawaran SET
          id_client = ?, kop_surat_id = ?, project = ?,
          judul_penawaran = ?, tanggal_penawaran = ?,
          status_ppn = ?, status_diskon_produk = ?, diskon_cetak = ?,
          diskon = ?, diskon_satu = ?, diskon_dua = ?, ppn = ?,
          total = ?, total_diskon = ?, total_diskon_1 = ?, total_diskon_2 = ?, grand_total = ?,
          json_produk = ?, syarat_kondisi = ?, catatan = ?,
          updated_at = ?
        WHERE id = ? AND id_user = ?
      `;
      
      // Debug checkbox values
      console.log('UPDATE - Checkbox values received:', {
        status_ppn,
        status_diskon_produk,
        diskon_cetak,
        types: {
          status_ppn: typeof status_ppn,
          status_diskon_produk: typeof status_diskon_produk,
          diskon_cetak: typeof diskon_cetak
        }
      });
      
      // Convert to TINYINT (1/0) - handle both boolean and truthy values
      const statusPpnValue = status_ppn === true || status_ppn === 1 || status_ppn === '1' ? 1 : 0;
      const statusDiskonProdukValue = status_diskon_produk === true || status_diskon_produk === 1 || status_diskon_produk === '1' ? 1 : 0;
      const diskonCetakValue = diskon_cetak === true || diskon_cetak === 1 || diskon_cetak === '1' ? 1 : 0;
      
      console.log('UPDATE - Converted to DB values:', {
        statusPpnValue,
        statusDiskonProdukValue,
        diskonCetakValue
      });
      
      const updateParams = [
        id_client, kop_surat_id, project,
        judul_penawaran, tanggal_penawaran,
        statusPpnValue, statusDiskonProdukValue, diskonCetakValue,
        diskonPercent, diskonSatuPercent, diskonDuaPercent, ppnPercent,
        subtotal, total_diskon, total_diskon_1, total_diskon_2, grand_total,
        JSON.stringify(json_produk || {}), JSON.stringify(processedSyaratKondisi), catatan,
        updateTime,
        id, userId
      ];
      
      console.log('UPDATE - Update params:', updateParams);
      console.log('🔍 UPDATE - json_produk before JSON.stringify:', json_produk);
      console.log('🔍 UPDATE - JSON.stringify result:', JSON.stringify(json_produk || {}));
      
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
        'SELECT id, title_header, alamat, notelp, fax, email, format_surat, nomor_bank FROM kop_surat WHERE status_deleted = 0 ORDER BY title_header'
      );
      res.json({ success: true, data: kopSurat });
    } catch (error) {
      console.error('Error in getKopSurat:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get ALL Product Categories at once (optimized untuk mobile)
  async getAllProductCategories(req, res) {
    try {
      const categories = {};
      
      // BLACK HDPE
      const blackHdpePipa = await queryCategoryProducts('black_hdpe_pipa_kategoris', 'black_hdpe_pipa_produks', true);
      const blackHdpeFitting = await queryCategoryProducts('black_hdpe_fitting_kategoris', 'black_hdpe_fitting_produks', false);
      
      // EXOPLAS
      const exoplasPipa = await queryCategoryProducts('exoplas_kategoris', 'exoplas_produks', true);
      const exoplasFitting = await queryCategoryProducts('exoplas_fitting_kategoris', 'exoplas_fitting_produks', false);
      
      // KELOX
      const keloxPipa = await queryCategoryProducts('kelox_pipa_kategoris', 'kelox_pipa_produks', true);
      const keloxFitting = await queryCategoryProducts('kelox_fitting_kategoris', 'kelox_fitting_produks', false);
      
      // LITE
      const litePipa = await queryCategoryProducts('lite_pipa_kategoris', 'lite_pipa_produks', true);
      const liteFitting = await queryCategoryProducts('lite_fitting_kategoris', 'lite_fitting_produks', false);
      
      // SAFE & LOK
      const safelokPipa = await queryCategoryProducts('safelok_pipa_kategoris', 'safelok_pipa_produks', true);
      const safelokFitting = await queryCategoryProducts('safelok_fitting_kategoris', 'safelok_fitting_produks', false);
      
      // ONDA
      const ondaPipa = await queryCategoryProducts('onda_pipa_kategoris', 'onda_pipa_produks', true);
      const ondaFitting = await queryCategoryProducts('onda_fitting_kategoris', 'onda_fitting_produks', false);
      
      // PPR
      const pprPipa = await queryCategoryProducts('ppr_pipa_kategoris', 'ppr_pipa_produks', true);
      const pprFitting = await queryCategoryProducts('ppr_fitting_kategoris', 'ppr_fitting_produks', false);
      
      // PIPA STANDARD
      const pipaStandardPipa = await queryCategoryProducts('pipa_standard_kategoris', 'pipa_standard_produks', true);
      const pipaStandardFitting = await queryCategoryProducts('pipa_standard_fitting_kategoris', 'pipa_standard_fitting_produks', false);

      // Group products by kategori
      const groupByKategori = (products) => {
        const grouped = {};
        products.forEach(product => {
          if (!product.id) return; // Skip if no product (only kategori)
          const kategoriKey = `${product.kategori_id}_${product.kategori_nama}`;
          if (!grouped[kategoriKey]) {
            grouped[kategoriKey] = {
              kategori_id: product.kategori_id,
              kategori_nama: product.kategori_nama,
              products: []
            };
          }
          grouped[kategoriKey].products.push({
            id: product.id,
            nama: product.nama,
            mm: product.mm,
            dn: product.dn,
            price: product.price,
            satuan: product.satuan
          });
        });
        return Object.values(grouped);
      };

      categories.black_hdpe_pipa = groupByKategori(blackHdpePipa);
      categories.black_hdpe_fitting = groupByKategori(blackHdpeFitting);
      categories.exoplas_pipa = groupByKategori(exoplasPipa);
      categories.exoplas_fitting = groupByKategori(exoplasFitting);
      categories.kelox_pipa = groupByKategori(keloxPipa);
      categories.kelox_fitting = groupByKategori(keloxFitting);
      categories.lite_pipa = groupByKategori(litePipa);
      categories.lite_fitting = groupByKategori(liteFitting);
      categories.safelok_pipa = groupByKategori(safelokPipa);
      categories.safelok_fitting = groupByKategori(safelokFitting);
      categories.onda_pipa = groupByKategori(ondaPipa);
      categories.onda_fitting = groupByKategori(ondaFitting);
      categories.ppr_pipa = groupByKategori(pprPipa);
      categories.ppr_fitting = groupByKategori(pprFitting);
      categories.pipa_standard_pipa = groupByKategori(pipaStandardPipa);
      categories.pipa_standard_fitting = groupByKategori(pipaStandardFitting);

      res.json({ success: true, data: categories });
    } catch (error) {
      console.error('Error in getAllProductCategories:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Individual getters (untuk backward compatibility & lazy loading)
  async getBlackHdpePipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM black_hdpe_pipa_kategoris k 
         LEFT JOIN black_hdpe_pipa_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getBlackHdpeFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM black_hdpe_fitting_kategoris k 
         LEFT JOIN black_hdpe_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getExoplasPipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM exoplas_kategoris k 
         LEFT JOIN exoplas_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getExoplasFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM exoplas_fitting_kategoris k 
         LEFT JOIN exoplas_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getKeloxPipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM kelox_pipa_kategoris k 
         LEFT JOIN kelox_pipa_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getKeloxFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM kelox_fitting_kategoris k 
         LEFT JOIN kelox_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getLitePipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM lite_pipa_kategoris k 
         LEFT JOIN lite_pipa_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getLiteFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM lite_fitting_kategoris k 
         LEFT JOIN lite_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getSafelokPipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM safe_lok_pipa_kategoris k 
         LEFT JOIN safe_lok_pipa_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getSafelokFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM safe_lok_fitting_kategoris k 
         LEFT JOIN safe_lok_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getOndaPipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM onda_pipa_kategoris k 
         LEFT JOIN onda_pipa_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getOndaFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM onda_fitting_kategoris k 
         LEFT JOIN onda_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getPprPipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM ppr_pipa_kategoris k 
         LEFT JOIN ppr_pipa_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getPprFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM ppr_fitting_kategoris k 
         LEFT JOIN ppr_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getPipaStandardPipa(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM pipa_standard_kategoris k 
         LEFT JOIN pipa_standard_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async getPipaStandardFitting(req, res) {
    try {
      const [products] = await db.execute(
        `SELECT k.id as kategori_id, k.nama as kategori_nama, p.id, p.nama, p.slug, p.mm, p.dn, p.price, p.satuan 
         FROM pipa_standard_fitting_kategoris k 
         LEFT JOIN pipa_standard_fitting_produks p ON k.id = p.kategori_id 
         WHERE k.status_deleted = 0 AND (p.status_deleted = 0 OR p.status_deleted IS NULL)
         ORDER BY k.nama, p.mm, p.dn`
      );
      res.json({ success: true, data: products });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new PenawaranController();