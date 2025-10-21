const PurchaseOrder = require('../models/PurchaseOrder');
const PoItem = require('../models/PoItem');
const Penawaran = require('../models/Penawaran');

class PurchaseOrderController {
  // Create Purchase Order
  static async create(req, res) {
    try {
      const {
        id_penawaran,
        catatan,
        selected_items,
        items
      } = req.body;

      const userId = req.user.id;

      // Validate required fields
      if (!id_penawaran || !selected_items || !items) {
        return res.status(400).json({
          success: false,
          message: 'ID penawaran, selected_items, dan items harus diisi'
        });
      }

      // Check if penawaran exists and is WIN
      const penawaran = await Penawaran.findById(id_penawaran);
      if (!penawaran) {
        return res.status(404).json({
          success: false,
          message: 'Penawaran tidak ditemukan'
        });
      }

      if (penawaran.status !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Hanya penawaran dengan status WIN yang dapat dibuat PO'
        });
      }

      // Check if penawaran already has PO
      const existingPO = await PurchaseOrder.findByPenawaranId(id_penawaran);
      if (existingPO) {
        return res.status(400).json({
          success: false,
          message: 'Penawaran ini sudah memiliki Purchase Order'
        });
      }

      // Generate nomor PO
      const nomorPO = await PurchaseOrder.generateNomorPO();

      // Create Purchase Order
      const poData = {
        id_penawaran,
        nomor_po: nomorPO,
        tanggal_po: new Date(),
        gudang_utama: penawaran.id_gudang,
        status_po: 'draft',
        prioritas: 'medium',
        catatan: catatan || '',
        created_by: userId
      };

      const poId = await PurchaseOrder.create(poData);

      // Create PO Items
      const poItems = [];
      for (const index of selected_items) {
        const itemData = items[index];
        if (!itemData) continue;

        // Get produk data from penawaran
        const produkList = [];
        if (penawaran.json_produk && typeof penawaran.json_produk === 'object') {
          Object.entries(penawaran.json_produk).forEach(([kategori, produks]) => {
            if (Array.isArray(produks) && produks.length > 0) {
              produks.forEach((item, idx) => {
                produkList.push(item);
              });
            }
          });
        }

        const produk = produkList[index];
        if (!produk) continue;

        const item = {
          id_po: poId,
          id_gudang: itemData.id_gudang,
          produk_data: produk,
          qty: itemData.qty || produk.qty || 1,
          harga: itemData.harga || produk.harga || 0,
          total_harga: (itemData.qty || produk.qty || 1) * (itemData.harga || produk.harga || 0),
          status_produksi: 'pending',
          prioritas: itemData.prioritas || 'medium',
          catatan: '',
          assigned_to: null
        };

        poItems.push(item);
      }

      // Bulk create PO items
      if (poItems.length > 0) {
        await PoItem.bulkCreate(poItems);
      }

      // Get created PO with items
      const createdPO = await PurchaseOrder.findById(poId);
      const poItemsData = await PoItem.findByPoId(poId);

      res.status(201).json({
        success: true,
        message: 'Purchase Order berhasil dibuat',
        data: {
          ...createdPO,
          items: poItemsData
        }
      });

    } catch (error) {
      console.error('Error creating purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat membuat Purchase Order'
      });
    }
  }

  // Get Purchase Orders (with filters)
  static async index(req, res) {
    try {
      const userId = req.user.id;
      const { search, status, gudang, limit = 10, offset = 0 } = req.query;

      const filters = {};
      if (search) filters.search = search;
      if (status) filters.status = status;
      if (gudang) filters.gudang = gudang;
      if (limit) filters.limit = parseInt(limit);
      if (offset) filters.offset = parseInt(offset);

      const purchaseOrders = await PurchaseOrder.findByUserId(userId, filters);

      res.json({
        success: true,
        message: 'Data Purchase Order berhasil diambil',
        data: purchaseOrders
      });

    } catch (error) {
      console.error('Error getting purchase orders:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil data Purchase Order'
      });
    }
  }

  // Get Purchase Order Stats
  static async getStats(req, res) {
    try {
      const userId = req.user.id;

      let stats = await PurchaseOrder.getStats(userId);

      // Jika stats null/undefined, isi default
      if (!stats) {
        stats = {
          total: 0,
          draft: 0,
          approved: 0,
          in_production: 0,
          completed: 0,
          cancelled: 0,
          urgent: 0,
        };
      } else {
        // Pastikan semua key ada
        stats.total = stats.total || 0;
        stats.draft = stats.draft || 0;
        stats.approved = stats.approved || 0;
        stats.in_production = stats.in_production || 0;
        stats.completed = stats.completed || 0;
        stats.cancelled = stats.cancelled || 0;
        stats.urgent = stats.urgent || 0;
      }

      res.json({
        success: true,
        message: 'Statistik Purchase Order berhasil diambil',
        data: stats
      });

    } catch (error) {
      console.error('Error getting PO stats:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil statistik Purchase Order'
      });
    }
  }

  // Get Purchase Order by ID
  static async show(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      // Get PO items
      const items = await PoItem.findByPoId(id);

      res.json({
        success: true,
        message: 'Detail Purchase Order berhasil diambil',
        data: {
          ...purchaseOrder,
          items
        }
      });

    } catch (error) {
      console.error('Error getting purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil detail Purchase Order'
      });
    }
  }

  // Update Purchase Order
  static async update(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      // Only allow update if status is draft
      if (purchaseOrder.status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya Purchase Order dengan status Draft yang dapat diedit'
        });
      }

      const updated = await PurchaseOrder.update(id, updateData);
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Gagal mengupdate Purchase Order'
        });
      }

      const updatedPO = await PurchaseOrder.findById(id);

      res.json({
        success: true,
        message: 'Purchase Order berhasil diupdate',
        data: updatedPO
      });

    } catch (error) {
      console.error('Error updating purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengupdate Purchase Order'
      });
    }
  }

  // Delete Purchase Order
  static async destroy(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      // Only allow delete if status is draft
      if (purchaseOrder.status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya Purchase Order dengan status Draft yang dapat dihapus'
        });
      }

      const deleted = await PurchaseOrder.delete(id);
      if (!deleted) {
        return res.status(400).json({
          success: false,
          message: 'Gagal menghapus Purchase Order'
        });
      }

      // Delete PO items
      await PoItem.deleteByPoId(id);

      res.json({
        success: true,
        message: 'Purchase Order berhasil dihapus'
      });

    } catch (error) {
      console.error('Error deleting purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat menghapus Purchase Order'
      });
    }
  }

  // Approve Purchase Order
  static async approve(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      if (purchaseOrder.status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya Purchase Order dengan status Draft yang dapat diapprove'
        });
      }

      const approved = await PurchaseOrder.approve(id, userId);
      if (!approved) {
        return res.status(400).json({
          success: false,
          message: 'Gagal approve Purchase Order'
        });
      }

      res.json({
        success: true,
        message: 'Purchase Order berhasil diapprove'
      });

    } catch (error) {
      console.error('Error approving purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat approve Purchase Order'
      });
    }
  }

  // Start Production
  static async startProduction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      if (purchaseOrder.status_po !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Hanya Purchase Order dengan status Approved yang dapat mulai produksi'
        });
      }

      const started = await PurchaseOrder.startProduction(id);
      if (!started) {
        return res.status(400).json({
          success: false,
          message: 'Gagal memulai produksi'
        });
      }

      res.json({
        success: true,
        message: 'Produksi berhasil dimulai'
      });

    } catch (error) {
      console.error('Error starting production:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat memulai produksi'
      });
    }
  }

  // Complete Production
  static async completeProduction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      if (purchaseOrder.status_po !== 'in_production') {
        return res.status(400).json({
          success: false,
          message: 'Hanya Purchase Order dengan status Produksi yang dapat diselesaikan'
        });
      }

      // Check if all items are completed
      const items = await PoItem.findByPoId(id);
      const incompleteItems = items.filter(item => item.status_produksi !== 'completed');
      if (incompleteItems.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Semua item harus selesai terlebih dahulu'
        });
      }

      const completed = await PurchaseOrder.completeProduction(id);
      if (!completed) {
        return res.status(400).json({
          success: false,
          message: 'Gagal menyelesaikan produksi'
        });
      }

      res.json({
        success: true,
        message: 'Produksi berhasil diselesaikan'
      });

    } catch (error) {
      console.error('Error completing production:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat menyelesaikan produksi'
      });
    }
  }

  // Cancel Purchase Order
  static async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      if (['completed', 'cancelled'].includes(purchaseOrder.status_po)) {
        return res.status(400).json({
          success: false,
          message: 'Purchase Order yang sudah selesai atau dibatalkan tidak dapat dibatalkan lagi'
        });
      }

      const cancelled = await PurchaseOrder.cancel(id, userId);
      if (!cancelled) {
        return res.status(400).json({
          success: false,
          message: 'Gagal membatalkan Purchase Order'
        });
      }

      res.json({
        success: true,
        message: 'Purchase Order berhasil dibatalkan'
      });

    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat membatalkan Purchase Order'
      });
    }
  }

  // Reactivate Purchase Order
  static async reactivate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      if (purchaseOrder.status_po !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Hanya Purchase Order yang dibatalkan yang dapat diaktifkan kembali'
        });
      }

      const reactivated = await PurchaseOrder.reactivate(id);
      if (!reactivated) {
        return res.status(400).json({
          success: false,
          message: 'Gagal mengaktifkan kembali Purchase Order'
        });
      }

      res.json({
        success: true,
        message: 'Purchase Order berhasil diaktifkan kembali'
      });

    } catch (error) {
      console.error('Error reactivating purchase order:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengaktifkan kembali Purchase Order'
      });
    }
  }

  // Get PO Items
  static async getItems(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      const items = await PoItem.findByPoId(id);

      res.json({
        success: true,
        message: 'Data item Purchase Order berhasil diambil',
        data: items
      });

    } catch (error) {
      console.error('Error getting PO items:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengambil data item Purchase Order'
      });
    }
  }

  // Update PO Item Status
  static async updateItemStatus(req, res) {
    try {
      const { id, itemId } = req.params;
      const { status_produksi, catatan } = req.body;
      const userId = req.user.id;

      const purchaseOrder = await PurchaseOrder.findById(id);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      // Check if user has access to this PO
      const penawaran = await Penawaran.findById(purchaseOrder.id_penawaran);
      if (!penawaran || penawaran.id_user !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Anda tidak memiliki akses ke Purchase Order ini'
        });
      }

      const item = await PoItem.findById(itemId);
      if (!item || item.id_po !== parseInt(id)) {
        return res.status(404).json({
          success: false,
          message: 'Item tidak ditemukan'
        });
      }

      const updateData = {
        status_produksi,
        catatan: catatan || item.catatan
      };

      const updated = await PoItem.update(itemId, updateData);
      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'Gagal mengupdate status item'
        });
      }

      res.json({
        success: true,
        message: 'Status item berhasil diupdate'
      });

    } catch (error) {
      console.error('Error updating PO item status:', error);
      res.status(500).json({
        success: false,
        message: 'Terjadi kesalahan saat mengupdate status item'
      });
    }
  }
}

module.exports = PurchaseOrderController; 