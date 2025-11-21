const db = require('../config/database');

class SuratJalanController {
  // Get all surat jalan for sales
  async index(req, res) {
    try {
      const userId = req.user.id;
      const { search, status, bulan } = req.query;
      
      let query = `
        SELECT sj.*, 
               po.nomor_po, po.id as po_id, po.gudang_utama,
               p.nomor_penawaran, p.judul_penawaran,
               c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               g.nama as gudang_nama
        FROM surat_jalan sj
        LEFT JOIN purchase_orders po ON sj.purchase_order_id = po.id
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        WHERE sj.deleted_status = 0
        AND EXISTS (
          SELECT 1 FROM penawaran p2 
          WHERE p2.id = po.id_penawaran 
          AND p2.id_user = ? 
          AND p2.status_deleted = 0
        )
      `;
      
      const params = [userId];
      
      // Search functionality
      if (search) {
        query += ` AND (sj.nomor_surat LIKE ? OR po.nomor_po LIKE ? OR p.judul_penawaran LIKE ? OR c.nama LIKE ?)`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      // Filter by status
      if (status !== undefined && status !== '') {
        query += ` AND sj.status = ?`;
        params.push(status);
      }
      
      // Filter by month
      if (bulan) {
        query += ` AND MONTH(sj.tanggal_pengiriman) = ? AND YEAR(sj.tanggal_pengiriman) = YEAR(CURDATE())`;
        params.push(bulan);
      }
      
      query += ` ORDER BY sj.created_at DESC LIMIT 50`;
      
      const [suratJalanData] = await db.execute(query, params);
      
      res.json({
        success: true,
        data: suratJalanData || []
      });
    } catch (error) {
      console.error('Error in surat jalan index:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get detail surat jalan
  async show(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get surat jalan detail
      const [suratJalanData] = await db.execute(`
        SELECT sj.*, 
               po.nomor_po, po.id as po_id, po.gudang_utama, po.created_by as po_created_by,
               p.nomor_penawaran, p.judul_penawaran, p.grand_total,
               c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               g.nama as gudang_nama,
               u.name as creator_name,
               k.title_header as kop_surat_title, k.alamat as kop_surat_alamat,
               k.notelp as kop_surat_notelp, k.fax as kop_surat_fax,
               k.email as kop_surat_email, k.logo as kop_surat_logo
        FROM surat_jalan sj
        LEFT JOIN purchase_orders po ON sj.purchase_order_id = po.id
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN kop_surat k ON p.kop_surat_id = k.id
        WHERE sj.id = ? AND sj.deleted_status = 0
        AND EXISTS (
          SELECT 1 FROM penawaran p2 
          WHERE p2.id = po.id_penawaran 
          AND p2.id_user = ? 
          AND p2.status_deleted = 0
        )
      `, [id, userId]);
      
      if (suratJalanData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Surat Jalan tidak ditemukan'
        });
      }
      
      const suratJalan = suratJalanData[0];
      
      // Parse items from json field (items disimpan dalam kolom json)
      let jsonItems = [];
      if (suratJalan.json) {
        try {
          jsonItems = typeof suratJalan.json === 'string' ? JSON.parse(suratJalan.json) : suratJalan.json;
        } catch (e) {
          console.error('Failed to parse json items:', e.message);
          jsonItems = [];
        }
      }
      
      // Process items data
      const items = Array.isArray(jsonItems) ? jsonItems.map(item => {
        return {
          ...item,
          nama_produk: item.nama_produk || item.item || 'Produk Tidak Diketahui',
          spesifikasi_lengkap: item.spesifikasi_lengkap || ''
        };
      }) : [];
      
      // Parse dokumentasi
      let buktiDokumentasi = [];
      if (suratJalan.bukti_dokumentasi) {
        try {
          buktiDokumentasi = typeof suratJalan.bukti_dokumentasi === 'string' 
            ? JSON.parse(suratJalan.bukti_dokumentasi) 
            : suratJalan.bukti_dokumentasi;
          
          // Ensure it's an array
          if (!Array.isArray(buktiDokumentasi)) {
            buktiDokumentasi = [];
          }
        } catch (e) {
          console.error('Failed to parse bukti_dokumentasi:', e.message);
          buktiDokumentasi = [];
        }
      }
      
      // Construct kop_surat object
      const kopSurat = {
        title_header: suratJalan.kop_surat_title,
        alamat: suratJalan.kop_surat_alamat,
        notelp: suratJalan.kop_surat_notelp,
        fax: suratJalan.kop_surat_fax,
        email: suratJalan.kop_surat_email,
        logo: suratJalan.kop_surat_logo
      };

      console.log('Surat Jalan Detail:', {
        id: suratJalan.id,
        nomor_surat: suratJalan.nomor_surat,
        bukti_dokumentasi_raw: suratJalan.bukti_dokumentasi,
        bukti_dokumentasi_parsed: buktiDokumentasi,
        bukti_dokumentasi_length: buktiDokumentasi.length,
        hasKopSurat: !!kopSurat.title_header
      });
      
      // Build response with nested penawaran structure for frontend compatibility
      const response = {
        ...suratJalan,
        items: items,
        bukti_dokumentasi: buktiDokumentasi,
        penawaran: {
          nomor_penawaran: suratJalan.nomor_penawaran,
          judul_penawaran: suratJalan.judul_penawaran,
          kop_surat: kopSurat,
          client: {
            nama: suratJalan.client_nama,
            nama_perusahaan: suratJalan.client_perusahaan
          }
        }
      };
      
      // Remove flattened fields to keep response clean (optional)
      delete response.kop_surat_title;
      delete response.kop_surat_alamat;
      delete response.kop_surat_notelp;
      delete response.kop_surat_fax;
      delete response.kop_surat_email;
      delete response.kop_surat_logo;
      
      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      console.error('Error in surat jalan show:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new SuratJalanController();
