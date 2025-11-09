const db = require('../config/database');

class PurchaseOrderController {
  // Get all purchase orders for sales
  async index(req, res) {
    try {
      const userId = req.user.id;
      const { search, status, gudang, bulan } = req.query;
      
      let query = `
        SELECT po.*, 
               p.nomor_penawaran, p.judul_penawaran, p.grand_total,
               c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               u.name as user_name, u.name as creator_name,
               g.nama as gudang_nama,
               approver.name as approver_name
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN users approver ON po.approved_by = approver.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        WHERE po.status_deleted = 0
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
        query += ` AND (po.nomor_po LIKE ? OR p.nomor_penawaran LIKE ? OR p.judul_penawaran LIKE ? OR c.nama LIKE ? OR c.nama_perusahaan LIKE ?)`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam, searchParam);
      }
      
      // Filter by status
      if (status !== undefined && status !== '') {
        query += ` AND po.status_po = ?`;
        params.push(status);
      }
      
      // Filter by gudang
      if (gudang !== undefined && gudang !== '') {
        query += ` AND po.gudang_utama = ?`;
        params.push(parseInt(gudang));
      }
      
      // Filter by bulan
      if (bulan !== undefined && bulan !== '') {
        query += ` AND MONTH(po.tanggal_po) = ?`;
        params.push(parseInt(bulan));
      }
      
      query += ` ORDER BY po.created_at DESC`;
      
      const [purchaseOrders] = await db.execute(query, params);
      
      // Get stats
      let statsQuery = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status_po = 'draft' THEN 1 ELSE 0 END) as draft,
          SUM(CASE WHEN status_po = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN status_po = 'in_production' THEN 1 ELSE 0 END) as in_production,
          SUM(CASE WHEN status_po = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status_po = 'cancelled' THEN 1 ELSE 0 END) as cancelled
        FROM purchase_orders po
        WHERE po.status_deleted = 0
        AND EXISTS (
          SELECT 1 FROM penawaran p2 
          WHERE p2.id = po.id_penawaran 
          AND p2.id_user = ? 
          AND p2.status_deleted = 0
        )
      `;
      
      const statsParams = [userId];
      
      if (search) {
        statsQuery += ` AND EXISTS (
          SELECT 1 FROM penawaran p3 
          WHERE p3.id = po.id_penawaran 
          AND (p3.nomor_penawaran LIKE ? OR p3.judul_penawaran LIKE ?)
        )`;
        const searchParam = `%${search}%`;
        statsParams.push(searchParam, searchParam);
      }
      
      if (status !== undefined && status !== '') {
        statsQuery += ` AND status_po = ?`;
        statsParams.push(status);
      }
      
      if (gudang !== undefined && gudang !== '') {
        statsQuery += ` AND gudang_utama = ?`;
        statsParams.push(parseInt(gudang));
      }
      
      if (bulan !== undefined && bulan !== '') {
        statsQuery += ` AND MONTH(tanggal_po) = ?`;
        statsParams.push(parseInt(bulan));
      }
      
      const [statsResult] = await db.execute(statsQuery, statsParams);
      const stats = statsResult[0];
      
      res.json({
        success: true,
        data: purchaseOrders,
        stats: {
          total: stats.total || 0,
          draft: stats.draft || 0,
          approved: stats.approved || 0,
          in_production: stats.in_production || 0,
          completed: stats.completed || 0,
          cancelled: stats.cancelled || 0
        }
      });
    } catch (error) {
      console.error('Error in purchase order index:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Get single purchase order detail
  async show(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      // Get PO basic info
      const query = `
        SELECT po.*, 
               p.nomor_penawaran, p.judul_penawaran, p.grand_total, p.json_produk,
               c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
               u.name as user_name, u.name as creator_name,
               g.nama as gudang_nama,
               approver.name as approver_name
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        LEFT JOIN users u ON po.created_by = u.id
        LEFT JOIN users approver ON po.approved_by = approver.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND EXISTS (
          SELECT 1 FROM penawaran p2 
          WHERE p2.id = po.id_penawaran 
          AND p2.id_user = ? 
          AND p2.status_deleted = 0
        )
      `;
      
      const [poData] = await db.execute(query, [id, userId]);
      
      if (poData.length === 0) {
        return res.status(404).json({ success: false, message: 'Purchase Order tidak ditemukan' });
      }
      
      const purchaseOrder = poData[0];
      
      // Get PO items
      const [itemsData] = await db.execute(`
        SELECT poi.*, g.nama as gudang_nama, u.name as assigned_user_name
        FROM po_items poi
        LEFT JOIN gudang g ON poi.id_gudang = g.id
        LEFT JOIN users u ON poi.assigned_to = u.id
        WHERE poi.id_po = ? AND poi.status_deleted = 0
        ORDER BY poi.created_at ASC
      `, [id]);
      
      // Process items data
      const items = itemsData.map(item => {
        const produkData = item.produk_data ? JSON.parse(item.produk_data) : {};
        
        return {
          ...item,
          nama_produk: produkData.item || 'Produk Tidak Diketahui',
          spesifikasi_lengkap: [
            produkData.type && `Type: ${produkData.type}`,
            produkData.diameter && `Diameter: ${produkData.diameter}`,
            produkData.panjang && `Panjang: ${produkData.panjang}`,
            produkData.ketebalan && `Ketebalan: ${produkData.ketebalan}`,
            produkData.warna && `Warna: ${produkData.warna}`
          ].filter(Boolean).join(', '),
          progress_percentage: item.qty > 0 ? Math.round((item.qty_completed || 0) / item.qty * 100) : 0
        };
      });
      
      // Get Surat Jalan
      const [suratJalanData] = await db.execute(`
        SELECT sj.*
        FROM surat_jalan sj
        WHERE sj.purchase_order_id = ? AND sj.deleted_status = 0
        ORDER BY sj.created_at DESC
      `, [id]);
      
      // Get File Purchase Inputs
      const [filePurchaseInputsData] = await db.execute(`
        SELECT fpi.*
        FROM file_purchase_input fpi
        WHERE fpi.id_purchase_order = ? AND fpi.status_deleted = 0
        ORDER BY fpi.created_at DESC
      `, [id]);
      
      // Build response
      purchaseOrder.penawaran = {
        nomor_penawaran: purchaseOrder.nomor_penawaran,
        judul_penawaran: purchaseOrder.judul_penawaran,
        grand_total: purchaseOrder.grand_total,
        client_nama: purchaseOrder.client_nama,
        user_name: purchaseOrder.user_name
      };
      
      purchaseOrder.items = items;
      purchaseOrder.surat_jalan = suratJalanData;
      purchaseOrder.file_purchase_inputs = filePurchaseInputsData;
      
      // Remove redundant fields
      delete purchaseOrder.nomor_penawaran;
      delete purchaseOrder.judul_penawaran;
      delete purchaseOrder.grand_total;
      delete purchaseOrder.client_nama;
      delete purchaseOrder.user_name;
      
      res.json({ success: true, data: purchaseOrder });
    } catch (error) {
      console.error('Error in purchase order show:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Create new purchase order
  async store(req, res) {
    try {
      console.log('=== PURCHASE ORDER STORE START ===');
      console.log('Request body:', req.body);
      console.log('Request files:', req.files);
      
      const userId = req.user.id;
      const {
        id_penawaran,
        id_gudang,
        catatan,
        selected_items,
        items
      } = req.body;
      
      // Parse JSON fields
      const selectedItems = typeof selected_items === 'string' ? JSON.parse(selected_items) : selected_items;
      const itemsData = typeof items === 'string' ? JSON.parse(items) : items;
      const files = req.files || [];

      console.log('Extracted data:', {
        userId,
        id_penawaran,
        id_gudang,
        catatan,
        selected_items: selectedItems,
        items: itemsData,
        files: files ? files.length : 0
      });
      
      // Validate input
      if (!id_penawaran || !id_gudang || !selectedItems || !itemsData) {
        return res.status(400).json({
          success: false,
          message: 'Data yang diperlukan tidak lengkap'
        });
      }
      
      // Check if files are uploaded (optional, not required)
      if (!files || files.length === 0) {
        console.log('No files uploaded');
      }
      
      // Check if penawaran exists and belongs to user
      const [penawaranData] = await db.execute(`
        SELECT p.*, c.id as id_client
        FROM penawaran p
        LEFT JOIN clients c ON p.id_client = c.id
        WHERE p.id = ? AND p.id_user = ? AND p.status_deleted = 0
      `, [id_penawaran, userId]);
      
      if (penawaranData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Penawaran tidak ditemukan'
        });
      }

      const penawaran = penawaranData[0];

      if (penawaran.status !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Hanya penawaran dengan status WIN yang bisa dibuat PO'
        });
      }
      
      // Check if PO already exists for this penawaran
      const [existingPO] = await db.execute(
        'SELECT id FROM purchase_orders WHERE id_penawaran = ? AND status_deleted = 0',
        [id_penawaran]
      );
      
      if (existingPO.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Purchase Order untuk penawaran ini sudah ada'
        });
      }

      // Get connection for transaction
      const connection = await db.getConnection();
      console.log('Database connection obtained');
      
      try {
        // Start transaction
        await connection.beginTransaction();
        console.log('Transaction started');

      // Generate nomor PO
        const month = new Date().getMonth() + 1;
        const year = new Date().getFullYear().toString().slice(-2);
        
        // Get last PO number for current month/year
        const [lastPO] = await connection.execute(
          'SELECT nomor_po FROM purchase_orders WHERE nomor_po LIKE ? ORDER BY id DESC LIMIT 1',
          [`%/PO/LAUTAN-REJEKI/${month}/${year}`]
        );
        
        let nextNumber = 1;
        if (lastPO.length > 0) {
          const lastNumber = parseInt(lastPO[0].nomor_po.split('/')[0]);
          nextNumber = lastNumber + 1;
        }
        
        const nomorUrut = nextNumber.toString().padStart(3, '0');
        const nomor_po = `${nomorUrut}/PO/LAUTAN-REJEKI/${month}/${year}`;
        
        console.log('Generated nomor PO:', nomor_po);
        
        // Get current time with +7 hours (WIB)
        const now = new Date();
        now.setHours(now.getHours() + 7);
        const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
        
        // Insert PO
        const [poResult] = await connection.execute(`
          INSERT INTO purchase_orders (
            id_penawaran, nomor_po, tanggal_po, gudang_utama, 
            status_po, prioritas, catatan, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 'draft', 'medium', ?, ?, ?, ?)
        `, [
          id_penawaran, nomor_po, new Date().toISOString().split('T')[0], id_gudang,
          catatan, userId, currentTime, currentTime
        ]);
        
        const poId = poResult.insertId;
        
        // Extract produk data from penawaran json_produk
        const produkData = [];
        if (penawaran.json_produk && typeof penawaran.json_produk === 'object') {
          Object.entries(penawaran.json_produk).forEach(([kategori, produks]) => {
            if (Array.isArray(produks)) {
              produks.forEach((item) => {
                produkData.push(item);
              });
            }
          });
        }

        // Insert PO items
        for (const index of selectedItems) {
          const itemData = itemsData[index];
          const produk = produkData[index];
          
          if (!itemData || !produk) continue;
          
          await connection.execute(`
            INSERT INTO po_items (
              id_po, id_gudang, produk_data, qty, harga, total_harga,
              status_produksi, prioritas, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
          `, [
            poId,
            itemData.id_gudang || id_gudang, // Use per-item gudang if available
            JSON.stringify(produk), // Store complete produk data as JSON
            itemData.qty || produk.qty || 1,
            itemData.harga || produk.harga || 0,
            (itemData.qty || produk.qty || 1) * (itemData.harga || produk.harga || 0),
            itemData.prioritas || 'medium',
            currentTime, currentTime
          ]);
        }
        
        // Handle file uploads
        if (files && files.length > 0) {
          for (const file of files) {
            // File already uploaded by multer, just save record to database
            await connection.execute(`
              INSERT INTO file_purchase_input (
                id_purchase_order, id_client, file_path, original_filename, 
                file_size, mime_type, status_deleted, created_by, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
            `, [
              poId, penawaran.id_client, `purchase-input-files/${file.filename}`,
              file.originalname, file.size, file.mimetype, userId, currentTime, currentTime
            ]);
          }
        }
        
        await connection.commit();
        console.log('Transaction committed successfully');
        
        res.json({
        success: true,
        message: 'Purchase Order berhasil dibuat',
          data: { id: poId, nomor_po }
        });
    } catch (error) {
        console.log('Transaction error, rolling back:', error.message);
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
        console.log('Database connection released');
      }
    } catch (error) {
      console.error('Error in purchase order store:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Internal server error' 
      });
    }
  }

  // Helper function to build spesifikasi
  buildSpesifikasi(produk) {
    const specs = [];
    if (produk.type) specs.push(`Type: ${produk.type}`);
    if (produk.diameter) specs.push(`Diameter: ${produk.diameter}`);
    if (produk.panjang) specs.push(`Panjang: ${produk.panjang}`);
    if (produk.ketebalan) specs.push(`Ketebalan: ${produk.ketebalan}`);
    if (produk.warna) specs.push(`Warna: ${produk.warna}`);
    if (produk.unit) specs.push(`Unit: ${produk.unit}`);
    return specs.join(', ');
  }

  // Update purchase order
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { gudang_nama, prioritas, target_selesai, catatan, selected_items, items } = req.body;
      
      // Check if PO exists and belongs to user
      const [poData] = await db.execute(`
        SELECT po.*, p.id_user, p.json_produk, c.id as id_client
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        LEFT JOIN clients c ON p.id_client = c.id
        WHERE po.id = ? AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (poData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Only allow update if status is draft
      if (poData[0].status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya dapat mengedit PO dengan status draft'
        });
      }
      
      // Get connection for transaction
      const connection = await db.getConnection();
      
      try {
        // Start transaction
        await connection.beginTransaction();
        
        // Get current time with +7 hours (WIB)
        const now = new Date();
        now.setHours(now.getHours() + 7);
        const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
        
        // Update PO basic info
        await connection.execute(`
          UPDATE purchase_orders 
          SET gudang_nama = ?, prioritas = ?, target_selesai = ?, catatan = ?, updated_at = ?
          WHERE id = ?
        `, [gudang_nama, prioritas, target_selesai, catatan, currentTime, id]);
        
        // Delete existing PO items
        await connection.execute('DELETE FROM po_items WHERE id_purchase_order = ?', [id]);
        
        // Insert new PO items
        if (selected_items && items && selected_items.length > 0) {
          const jsonProduk = poData[0].json_produk;
          
          // Extract produk data from penawaran json_produk
          const produkData = [];
          if (jsonProduk && typeof jsonProduk === 'object') {
            Object.entries(jsonProduk).forEach(([kategori, produks]) => {
              if (Array.isArray(produks)) {
                produks.forEach((item) => {
                  produkData.push(item);
                });
              }
            });
          }
          
          for (const index of selected_items) {
            const itemData = items[index];
            const produk = produkData[index];
            
            if (!itemData || !produk) continue;
            
            await connection.execute(`
              INSERT INTO po_items (
                id_po, id_gudang, produk_data, qty, harga, total_harga,
                status_produksi, prioritas, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            `, [
              id,
              itemData.id_gudang || gudang_nama, // Use per-item gudang if available
              JSON.stringify(produk), // Store complete produk data as JSON
              itemData.qty || produk.qty || 1,
              itemData.harga || produk.harga || 0,
              (itemData.qty || produk.qty || 1) * (itemData.harga || produk.harga || 0),
              itemData.prioritas || 'medium',
              currentTime, currentTime
            ]);
          }
        }
        
        await connection.commit();

      res.json({
        success: true,
          message: 'Purchase Order berhasil diperbarui'
      });
    } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } catch (error) {
      console.error('Error in purchase order update:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Delete purchase order
  async destroy(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if PO exists and belongs to user
      const [existingPO] = await db.execute(`
        SELECT po.* FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (existingPO.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      if (existingPO[0].status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'PO yang sudah diapprove tidak dapat dihapus'
        });
      }
      
      // Soft delete PO
      await db.execute(
        'UPDATE purchase_orders SET status_deleted = 1 WHERE id = ?',
        [id]
      );

      res.json({
        success: true,
        message: 'Purchase Order berhasil dihapus'
      });
    } catch (error) {
      console.error('Error in purchase order destroy:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Approve purchase order
  async approve(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if PO exists and belongs to user
      const [existingPO] = await db.execute(`
        SELECT po.* FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (existingPO.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      if (existingPO[0].status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status draft yang bisa diapprove'
        });
      }
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // Approve PO
      await db.execute(`
        UPDATE purchase_orders SET
          status_po = 'approved', approved_by = ?, approved_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [userId, currentTime, currentTime, id]);

      res.json({
        success: true,
        message: 'Purchase Order berhasil diapprove'
      });
    } catch (error) {
      console.error('Error in purchase order approve:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Start production
  async startProduction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if PO exists and belongs to user
      const [existingPO] = await db.execute(`
        SELECT po.* FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (existingPO.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      if (existingPO[0].status_po !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status approved yang bisa mulai produksi'
        });
      }
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // Start production
      await db.execute(`
        UPDATE purchase_orders SET
          status_po = 'in_production', updated_at = ?
        WHERE id = ?
      `, [currentTime, id]);

      res.json({
        success: true,
        message: 'Produksi berhasil dimulai'
      });
    } catch (error) {
      console.error('Error in purchase order start production:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Complete production
  async completeProduction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if PO exists and belongs to user
      const [existingPO] = await db.execute(`
        SELECT po.* FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (existingPO.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      if (existingPO[0].status_po !== 'in_production') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status in_production yang bisa diselesaikan'
        });
      }
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // Complete production
      await db.execute(`
        UPDATE purchase_orders SET
          status_po = 'completed', updated_at = ?
        WHERE id = ?
      `, [currentTime, id]);

      res.json({
        success: true,
        message: 'Produksi berhasil diselesaikan'
      });
    } catch (error) {
      console.error('Error in purchase order complete production:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Cancel purchase order
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if PO exists and belongs to user
      const [existingPO] = await db.execute(`
        SELECT po.* FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (existingPO.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      if (!['draft', 'approved'].includes(existingPO[0].status_po)) {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status draft atau approved yang bisa dibatalkan'
        });
      }
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // Cancel PO
      await db.execute(`
        UPDATE purchase_orders SET
          status_po = 'cancelled', cancelled_by = ?, cancelled_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [userId, currentTime, currentTime, id]);

      res.json({
        success: true,
        message: 'Purchase Order berhasil dibatalkan'
      });
    } catch (error) {
      console.error('Error in purchase order cancel:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Reactivate purchase order
  async reactivate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Check if PO exists and belongs to user
      const [existingPO] = await db.execute(`
        SELECT po.* FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND po.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (existingPO.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      if (existingPO[0].status_po !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status cancelled yang bisa diaktifkan kembali'
        });
      }
      
      // Get current time with +7 hours (WIB)
      const now = new Date();
      now.setHours(now.getHours() + 7);
      const currentTime = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // Reactivate PO
      await db.execute(`
        UPDATE purchase_orders SET
          status_po = 'draft', cancelled_by = NULL, cancelled_at = NULL,
          updated_at = ?
        WHERE id = ?
      `, [currentTime, id]);

      res.json({
        success: true,
        message: 'Purchase Order berhasil diaktifkan kembali'
      });
    } catch (error) {
      console.error('Error in purchase order reactivate:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Update purchase order
  async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { gudang_nama, prioritas, target_selesai, catatan, selected_items, items } = req.body;
      
      // Check if PO exists and belongs to user
      const [poData] = await db.execute(`
        SELECT po.*, p.id_user, p.json_produk
        FROM purchase_orders po
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE po.id = ? AND p.id_user = ? AND p.status_deleted = 0
      `, [id, userId]);
      
      if (poData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Only allow update if status is draft
      if (poData[0].status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya dapat mengedit PO dengan status draft'
        });
      }
      
      // Start transaction
      await db.execute('START TRANSACTION');
      
      try {
        // Update PO basic info
        await db.execute(`
          UPDATE purchase_orders 
          SET gudang_nama = ?, prioritas = ?, target_selesai = ?, catatan = ?, updated_at = ?
          WHERE id = ?
        `, [gudang_nama, prioritas, target_selesai, catatan, new Date(), id]);
        
        // Delete existing PO items
        await db.execute('DELETE FROM po_items WHERE id_purchase_order = ?', [id]);
        
        // Insert new PO items
        if (selected_items && items && selected_items.length > 0) {
          const jsonProduk = poData[0].json_produk;
          
          for (const index of selected_items) {
            const itemData = items[index];
            const produkData = this.findProdukByIndex(jsonProduk, parseInt(index));
            
            if (produkData) {
              await db.execute(`
                INSERT INTO po_items (
                  id_purchase_order, nama_produk, spesifikasi_lengkap, 
                  qty, harga, total_harga, prioritas, status_produksi, 
                  created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
              `, [
                id,
                produkData.item || 'Produk',
                this.buildSpesifikasi(produkData),
                itemData.qty || produkData.qty || 1,
                itemData.harga || produkData.harga || 0,
                (itemData.qty || produkData.qty || 1) * (itemData.harga || produkData.harga || 0),
                itemData.prioritas || 'medium',
                new Date(),
                new Date()
              ]);
            }
          }
        }
        
        await db.execute('COMMIT');

      res.json({
        success: true,
          message: 'Purchase Order berhasil diperbarui'
      });
    } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error in purchase order update:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // Helper function to find produk by index
  findProdukByIndex(jsonProduk, targetIndex) {
    if (!jsonProduk || typeof jsonProduk !== 'object') return null;
    
    let currentIndex = 0;
    for (const [kategori, produks] of Object.entries(jsonProduk)) {
      if (Array.isArray(produks)) {
        for (const item of produks) {
          if (currentIndex === targetIndex) {
            return item;
          }
          currentIndex++;
        }
      }
    }
    return null;
  }

  // Helper function to build spesifikasi
  buildSpesifikasi(produk) {
    const specs = [];
    if (produk.type) specs.push(`Type: ${produk.type}`);
    if (produk.diameter) specs.push(`Diameter: ${produk.diameter}`);
    if (produk.panjang) specs.push(`Panjang: ${produk.panjang}`);
    if (produk.ketebalan) specs.push(`Ketebalan: ${produk.ketebalan}`);
    if (produk.warna) specs.push(`Warna: ${produk.warna}`);
    if (produk.unit) specs.push(`Unit: ${produk.unit}`);
    return specs.join(', ');
  }

  // Delete file purchase input
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      // Check if file exists and belongs to user's PO
      const [fileData] = await db.execute(`
        SELECT fpi.*, po.id as po_id
        FROM file_purchase_input fpi
        LEFT JOIN purchase_orders po ON fpi.id_purchase_order = po.id
        LEFT JOIN penawaran p ON po.id_penawaran = p.id
        WHERE fpi.id = ? AND fpi.status_deleted = 0
        AND p.id_user = ? AND p.status_deleted = 0
      `, [fileId, userId]);
      
      if (fileData.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'File tidak ditemukan'
        });
      }
      
      // Soft delete file
      await db.execute(
        'UPDATE file_purchase_input SET status_deleted = 1 WHERE id = ?',
        [fileId]
      );

      res.json({
        success: true,
        message: 'File berhasil dihapus'
      });
    } catch (error) {
      console.error('Error in delete file:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new PurchaseOrderController();