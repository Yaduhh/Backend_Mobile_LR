const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const STATUS_META = {
  draft: {
    text: 'Draft',
    badge: {
      bg: '#F3F4F6',
      text: '#111827',
      border: '#D1D5DB',
      icon: 'document-text-outline'
    }
  },
  approved: {
    text: 'Menunggu Gudang',
    badge: {
      bg: '#FFFBEB',
      text: '#92400E',
      border: '#FCD34D',
      icon: 'time-outline'
    }
  },
  in_production: {
    text: 'Sedang Diproduksi',
    badge: {
      bg: '#EEF2FF',
      text: '#3730A3',
      border: '#C7D2FE',
      icon: 'construct-outline'
    }
  },
  completed: {
    text: 'Selesai',
    badge: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
      icon: 'checkmark-circle-outline'
    }
  },
  cancelled: {
    text: 'Dibatalkan',
    badge: {
      bg: '#FEE2E2',
      text: '#B91C1C',
      border: '#FCA5A5',
      icon: 'close-circle-outline'
    }
  },
  closed: {
    text: 'Ditutup',
    badge: {
      bg: '#F3E8FF',
      text: '#7C3AED',
      border: '#E9D5FF',
      icon: 'lock-closed-outline'
    }
  },
  default: {
    text: 'Tidak Diketahui',
    badge: {
      bg: '#F3F4F6',
      text: '#111827',
      border: '#D1D5DB',
      icon: 'help-circle-outline'
    }
  }
};

const PRIORITY_META = {
  urgent: {
    text: 'Urgent',
    badge: {
      bg: '#FEE2E2',
      text: '#B91C1C',
      border: '#FCA5A5'
    }
  },
  high: {
    text: 'High',
    badge: {
      bg: '#FEF3C7',
      text: '#B45309',
      border: '#FCD34D'
    }
  },
  medium: {
    text: 'Medium',
    badge: {
      bg: '#DBEAFE',
      text: '#1D4ED8',
      border: '#93C5FD'
    }
  },
  low: {
    text: 'Low',
    badge: {
      bg: '#E5E7EB',
      text: '#374151',
      border: '#D1D5DB'
    }
  },
  default: {
    text: 'Medium',
    badge: {
      bg: '#DBEAFE',
      text: '#1D4ED8',
      border: '#93C5FD'
    }
  }
};

const ITEM_STATUS_META = {
  pending: {
    text: 'Menunggu',
    badge: {
      bg: '#F3F4F6',
      text: '#111827',
      border: '#D1D5DB'
    }
  },
  in_progress: {
    text: 'Sedang Diproduksi',
    badge: {
      bg: '#FEF3C7',
      text: '#B45309',
      border: '#FCD34D'
    }
  },
  completed: {
    text: 'Selesai',
    badge: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0'
    }
  },
  cancelled: {
    text: 'Dibatalkan',
    badge: {
      bg: '#FEE2E2',
      text: '#B91C1C',
      border: '#FCA5A5'
    }
  },
  default: {
    text: 'Menunggu',
    badge: {
      bg: '#F3F4F6',
      text: '#111827',
      border: '#D1D5DB'
    }
  }
};

const SURAT_JALAN_STATUS_META = {
  draft: {
    text: 'Draft',
    badge: {
      bg: '#F3F4F6',
      text: '#111827',
      border: '#D1D5DB',
      icon: 'document-text-outline'
    }
  },
  terkirim: {
    text: 'Terkirim',
    badge: {
      bg: '#DBEAFE',
      text: '#1D4ED8',
      border: '#93C5FD',
      icon: 'send-outline'
    }
  },
  diterima: {
    text: 'Diterima',
    badge: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
      icon: 'checkmark-done-outline'
    }
  },
  default: {
    text: 'Draft',
    badge: {
      bg: '#F3F4F6',
      text: '#111827',
      border: '#D1D5DB',
      icon: 'document-text-outline'
    }
  }
};

const safeJSONParse = (value) => {
  if (!value) return null;
  try {
    if (typeof value === 'object') return value;
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const buildDokumentasiPayload = ({
  file,
  suratJalanId,
  timestamp,
  userId,
  catatan
}) => {
  const relativePath = path
    .join('dokumentasi', 'surat-jalan', String(suratJalanId), file.filename)
    .replace(/\\/g, '/');

  return {
    filename: file.originalname || file.filename,
    stored_filename: file.filename,
    path: relativePath,
    mimetype: file.mimetype || null,
    size: file.size || null,
    uploaded_at: timestamp,
    uploaded_by: userId,
    catatan: catatan || null
  };
};

const buildSpesifikasi = (produk = {}) => {
  const specs = [];
  if (produk.type) specs.push(`Type: ${produk.type}`);
  if (produk.diameter) specs.push(`Diameter: ${produk.diameter}`);
  if (produk.panjang) specs.push(`Panjang: ${produk.panjang}`);
  if (produk.ketebalan) specs.push(`Ketebalan: ${produk.ketebalan}`);
  if (produk.warna) specs.push(`Warna: ${produk.warna}`);
  return specs.join(', ');
};

const toRomanMonth = (monthNumber) => {
  const romans = [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VII',
    'VIII',
    'IX',
    'X',
    'XI',
    'XII'
  ];
  const index = Math.max(1, Math.min(12, Number(monthNumber))) - 1;
  return romans[index];
};

const nowWib = () => {
  const now = new Date();
  now.setHours(now.getHours() + 7);
  return now.toISOString().slice(0, 19).replace('T', ' ');
};

const generateNomorSuratJalan = async (purchaseOrder) => {
  const now = new Date();
  now.setHours(now.getHours() + 7);
  const tanggal = String(now.getDate()).padStart(2, '0');
  const bulan = String(now.getMonth() + 1).padStart(2, '0');
  const tahun = now.getFullYear();
  const bulanRoman = toRomanMonth(now.getMonth() + 1);
  const gudangId = purchaseOrder.gudang_utama || '000';

  const todayDate = now.toISOString().slice(0, 10);
  const [countRows] = await db.execute(
    `
      SELECT COUNT(*) AS total
      FROM surat_jalan
      WHERE DATE(created_at) = ?
    `,
    [todayDate]
  );
  const index =
    ((countRows[0] && countRows[0].total) ? countRows[0].total : 0) + 1;
  const indexFormatted = String(index).padStart(2, '0');

  return `${indexFormatted}/${gudangId}/${tanggal}/${bulanRoman}/SJ-LR/${tahun}`;
};

const getUserGudangIds = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT id
      FROM gudang
      WHERE penanggung_jawab = ? AND status_deleted = 0
    `,
    [userId]
  );
  return rows.map((row) => row.id);
};

const getPurchaseOrderById = async (id) => {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM purchase_orders
      WHERE id = ? AND status_deleted = 0
    `,
    [id]
  );
  return rows[0] || null;
};

const getPoItemById = async (id) => {
  const [rows] = await db.execute(
    `
      SELECT *
      FROM po_items
      WHERE id = ? AND status_deleted = 0
    `,
    [id]
  );
  return rows[0] || null;
};

const buildLatestProgressMap = (progressRows = []) => {
  const latest = {};
  progressRows.forEach((row) => {
    const key = `${row.po_item_id}_${row.gudang_id}`;
    if (!latest[key]) {
      latest[key] = row;
      return;
    }
    const current = latest[key];
    const currentDate = new Date(current.progress_date);
    const newDate = new Date(row.progress_date);
    if (
      newDate > currentDate ||
      (newDate.getTime() === currentDate.getTime() && row.id > current.id)
    ) {
      latest[key] = row;
    }
  });
  return latest;
};

const getLatestProgressByItem = async (poItemId) => {
  const [rows] = await db.execute(
    `
      SELECT pp.*, g.nama AS gudang_nama, g.lokasi AS gudang_lokasi, u.name AS updated_by_name
      FROM production_progress pp
      LEFT JOIN gudang g ON pp.gudang_id = g.id
      LEFT JOIN users u ON pp.updated_by = u.id
      WHERE pp.po_item_id = ?
      ORDER BY pp.progress_date DESC, pp.id DESC
    `,
    [poItemId]
  );

  const latestMap = buildLatestProgressMap(rows);
  return Object.values(latestMap);
};

const sumLatestProgress = async (poItemId) => {
  const latest = await getLatestProgressByItem(poItemId);
  return latest.reduce(
    (sum, progress) => sum + Number(progress.qty_completed || 0),
    0
  );
};

const getUserName = async (userId) => {
  const [rows] = await db.execute(
    `
      SELECT name
      FROM users
      WHERE id = ?
    `,
    [userId]
  );
  return rows[0] ? rows[0].name : 'User';
};

const handleControllerError = (res, error, defaultMessage) => {
  console.error(defaultMessage, error);
  const statusCode = error.status || 500;
  res.status(statusCode).json({
    success: false,
    message: error.message || defaultMessage
  });
};

const checkPoAccess = async (poId, userId) => {
  const po = await getPurchaseOrderById(poId);
  if (!po) {
    const error = new Error('Purchase Order tidak ditemukan');
    error.status = 404;
    throw error;
  }

  const userGudangIds = await getUserGudangIds(userId);
  if (!userGudangIds.includes(po.gudang_utama)) {
    const error = new Error('Anda tidak memiliki akses ke Purchase Order ini.');
    error.status = 403;
    throw error;
  }

  return { po, userGudangIds };
};

const checkTransferAccess = async (po, userId) => {
  const userGudangIds = await getUserGudangIds(userId);
  if (userGudangIds.includes(po.gudang_utama)) {
    return { po, userGudangIds, hasDirectAccess: true };
  }

  const [itemRows] = await db.execute(
    `
      SELECT id, id_gudang
      FROM po_items
      WHERE id_po = ? AND status_deleted = 0
    `,
    [po.id]
  );
  const itemGudangIds = itemRows.map((row) => row.id_gudang);
  const intersects = itemGudangIds.some((id) => userGudangIds.includes(id));
  if (intersects) {
    return { po, userGudangIds, hasDirectAccess: false };
  }

  const itemIds = itemRows.map((row) => row.id);
  if (itemIds.length) {
    const placeholders = itemIds.map(() => '?').join(',');
    const [progressRows] = await db.execute(
      `
        SELECT DISTINCT gudang_id
        FROM production_progress
        WHERE po_item_id IN (${placeholders})
      `,
      itemIds
    );
    const progressGudangIds = progressRows.map((row) => row.gudang_id);
    const hasProgressAccess = progressGudangIds.some((id) =>
      userGudangIds.includes(id)
    );
    if (hasProgressAccess) {
      return { po, userGudangIds, hasDirectAccess: false };
    }
  }

  const error = new Error('Anda tidak memiliki akses ke Purchase Order ini.');
  error.status = 403;
  throw error;
};

class GudangPurchaseOrderController {
  async detail(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Ambil data purchase order dasar
      const [poRows] = await db.execute(
        `
          SELECT 
            po.*,
            p.nomor_penawaran,
            p.judul_penawaran,
            p.grand_total,
            p.json_produk,
            c.nama AS client_nama,
            c.nama_perusahaan AS client_perusahaan,
            creator.name AS creator_name,
            approver.name AS approver_name,
            gu.nama AS gudang_utama_nama,
            gu.lokasi AS gudang_utama_lokasi
          FROM purchase_orders po
          LEFT JOIN penawaran p ON po.id_penawaran = p.id
          LEFT JOIN clients c ON p.id_client = c.id
          LEFT JOIN users creator ON po.created_by = creator.id
          LEFT JOIN users approver ON po.approved_by = approver.id
          LEFT JOIN gudang gu ON po.gudang_utama = gu.id
          WHERE po.id = ? AND po.status_deleted = 0
        `,
        [id]
      );

      if (!poRows.length) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan'
        });
      }

      const po = poRows[0];

      const { userGudangIds } = await checkTransferAccess(po, userId);

      // Ambil daftar gudang aktif
      const [gudangRows] = await db.execute(
        `
          SELECT id, nama, lokasi
          FROM gudang
          WHERE status_deleted = 0
          ORDER BY nama ASC
        `
      );

      // Ambil item PO
      const [itemRows] = await db.execute(
        `
          SELECT 
            poi.*,
            g.nama AS gudang_nama,
            g.lokasi AS gudang_lokasi,
            u.name AS assigned_user_name
          FROM po_items poi
          LEFT JOIN gudang g ON poi.id_gudang = g.id
          LEFT JOIN users u ON poi.assigned_to = u.id
          WHERE poi.id_po = ? AND poi.status_deleted = 0
          ORDER BY poi.created_at ASC
        `,
        [id]
      );

      const itemIds = itemRows.map((row) => row.id);

      // Ambil data progress produksi
      let progressRows = [];
      if (itemIds.length) {
        const placeholders = itemIds.map(() => '?').join(',');
        const [rows] = await db.execute(
          `
            SELECT 
              pp.*,
              g.nama AS gudang_nama,
              g.lokasi AS gudang_lokasi,
              u.name AS updated_by_name
            FROM production_progress pp
            LEFT JOIN gudang g ON pp.gudang_id = g.id
            LEFT JOIN users u ON pp.updated_by = u.id
            WHERE pp.po_item_id IN (${placeholders})
            ORDER BY pp.progress_date DESC, pp.id DESC
          `,
          itemIds
        );
        progressRows = rows;
      }

      // Map progress terbaru per gudang
      const latestProgressMap = {};
      progressRows.forEach((row) => {
        const key = `${row.po_item_id}_${row.gudang_id}`;
        const currentLatest = latestProgressMap[key];

        if (!currentLatest) {
          latestProgressMap[key] = row;
          return;
        }

        const currentDate = new Date(currentLatest.progress_date);
        const newDate = new Date(row.progress_date);
        if (newDate > currentDate) {
          latestProgressMap[key] = row;
        }
      });

      // Ambil data surat jalan
      const [suratJalanRowsRaw] = await db.execute(
        `
          SELECT 
            sj.*,
            u.name AS author_name
          FROM surat_jalan sj
          LEFT JOIN users u ON sj.author = u.id
          WHERE sj.purchase_order_id = ? AND sj.deleted_status = 0
          ORDER BY sj.created_at DESC
        `,
        [id]
      );

      const shippedQtyMap = {};
      const suratJalanRows = suratJalanRowsRaw.map((row) => {
        const items = safeJSONParse(row.json) || [];
        items.forEach((item) => {
          const key = `${item.gudang_id}_${item.item_id}`;
          const qty = Number(item.qty_kirim || 0);
          shippedQtyMap[key] = (shippedQtyMap[key] || 0) + qty;
        });

        const statusMeta =
          SURAT_JALAN_STATUS_META[row.status] || SURAT_JALAN_STATUS_META.default;

        return {
          ...row,
          items,
          status_meta: statusMeta
        };
      });

      // Hitung ringkasan dan detail item
      let totalQtyTarget = 0;
      let totalCompleted = 0;
      let totalShipped = 0;

      const items = itemRows.map((row) => {
        const produkData = safeJSONParse(row.produk_data) || {};
        const progressForItem = progressRows.filter(
          (progress) => progress.po_item_id === row.id
        );
        const latestByGudang = Object.values(latestProgressMap).filter(
          (progress) => progress.po_item_id === row.id
        );

        const qtyCompletedLatest = latestByGudang.reduce(
          (sum, progress) => sum + Number(progress.qty_completed || 0),
          0
        );
        const qtyTarget = Number(row.qty || 0);
        const qtyRemaining = Math.max(0, qtyTarget - qtyCompletedLatest);
        const progressPercentage =
          qtyTarget > 0
            ? Math.round((qtyCompletedLatest / qtyTarget) * 100)
            : 0;

        totalQtyTarget += qtyTarget;
        totalCompleted += qtyCompletedLatest;

        const progressPerGudang = latestByGudang.map((progress) => ({
          id: progress.id,
          gudang_id: progress.gudang_id,
          gudang_nama: progress.gudang_nama,
          gudang_lokasi: progress.gudang_lokasi,
          qty_completed: Number(progress.qty_completed || 0),
          qty_target: Number(progress.qty_target || qtyTarget),
          percentage:
            qtyTarget > 0
              ? Math.round(
                  (Number(progress.qty_completed || 0) / qtyTarget) * 100
                )
              : 0,
          progress_date: progress.progress_date,
          catatan: progress.catatan
        }));

        const shippedFromSuratJalan = Object.entries(shippedQtyMap)
          .filter(([key]) => key.endsWith(`_${row.id}`))
          .reduce((sum, [, qty]) => sum + qty, 0);

        totalShipped += Math.min(shippedFromSuratJalan, qtyCompletedLatest);

        const availableShipments = progressPerGudang
          .map((progress) => {
            const key = `${progress.gudang_id}_${row.id}`;
            const alreadyShipped = shippedQtyMap[key] || 0;
            const availableQty = Math.max(
              0,
              Number(progress.qty_completed || 0) - alreadyShipped
            );
            return {
              gudang_id: progress.gudang_id,
              gudang_nama: progress.gudang_nama,
              qty_completed: progress.qty_completed,
              already_shipped: alreadyShipped,
              available_qty: availableQty,
              percentage: progress.percentage
            };
          })
          .filter((item) => item.available_qty > 0);

        const currentGudangId = row.id_gudang;
        const currentProgress = latestByGudang.find(
          (progress) => progress.gudang_id === currentGudangId
        );
        const currentGudangQty = currentProgress
          ? Number(currentProgress.qty_completed || 0)
          : 0;

        const otherGudangTotal = latestByGudang
          .filter((progress) => progress.gudang_id !== currentGudangId)
          .reduce((sum, progress) => sum + Number(progress.qty_completed || 0), 0);

        const isTransferredGudang = currentProgress
          ? (currentProgress.catatan || '').toLowerCase().includes('transfer dari')
          : false;

        let maxQtyForCurrent = qtyTarget - otherGudangTotal;
        if (isTransferredGudang) {
          maxQtyForCurrent = qtyTarget - qtyCompletedLatest + currentGudangQty;
        }

        const progressHistory = progressForItem.map((progress) => ({
          id: progress.id,
          gudang_id: progress.gudang_id,
          gudang_nama: progress.gudang_nama,
          qty_completed: Number(progress.qty_completed || 0),
          qty_target: Number(progress.qty_target || qtyTarget),
          catatan: progress.catatan,
          updated_by: progress.updated_by,
          updated_by_name: progress.updated_by_name,
          progress_date: progress.progress_date
        }));

        const gudangsWithProgress = new Set(
          progressPerGudang.map((progress) => progress.gudang_id)
        );
        const availableGudangTargets = gudangRows.filter(
          (gudang) => !gudangsWithProgress.has(gudang.id)
        );

        const itemGudangId = Number(row.id_gudang || 0);
        const userHasAccessToProgressGudang = userGudangIds.includes(itemGudangId);

        return {
          id: row.id,
          id_po: row.id_po,
          produk: {
            nama: produkData.item || row.nama_produk || 'Produk Tidak Diketahui',
            data: produkData,
            spesifikasi: buildSpesifikasi(produkData)
          },
          gudang: {
            id: row.id_gudang,
            nama: row.gudang_nama,
            lokasi: row.gudang_lokasi
          },
          qty: qtyTarget,
          harga: Number(row.harga || 0),
          total_harga: Number(row.total_harga || 0),
          prioritas: row.prioritas,
          status_produksi: row.status_produksi,
          status_meta:
            ITEM_STATUS_META[row.status_produksi] || ITEM_STATUS_META.default,
          catatan: row.catatan,
          target_selesai: row.target_selesai,
          assigned_user_name: row.assigned_user_name,
          progress_percentage: progressPercentage,
          qty_completed: qtyCompletedLatest,
          qty_remaining: qtyRemaining,
          progress_per_gudang: progressPerGudang,
          history: progressHistory,
          available_shipments: availableShipments,
          computed: {
            current_gudang_qty: currentGudangQty,
            other_gudang_total: otherGudangTotal,
            min_qty_for_current: currentGudangQty + otherGudangTotal,
            max_qty_for_current: Math.max(0, maxQtyForCurrent),
            is_transferred_gudang: isTransferredGudang,
            available_gudang_targets: availableGudangTargets,
            user_has_access_to_progress_gudang: userHasAccessToProgressGudang,
            can_transfer:
              progressPercentage < 100 &&
              availableGudangTargets.length > 0 &&
              userHasAccessToProgressGudang &&
              !isTransferredGudang
          }
        };
      });

      const totalSisaBelumTerkirim = Math.max(0, totalCompleted - totalShipped);
      const totalQtyRemaining = Math.max(0, totalQtyTarget - totalCompleted);
      const overallProgress =
        totalQtyTarget > 0
          ? Number(((totalShipped / totalQtyTarget) * 100).toFixed(1))
          : 0;

      const statusMeta =
        STATUS_META[po.status_po] || STATUS_META.default;
      const priorityMeta =
        PRIORITY_META[po.prioritas] || PRIORITY_META.default;

      const pendingItemsCount = items.filter(
        (item) => item.status_produksi === 'pending'
      ).length;
      const inProgressItemsCount = items.filter(
        (item) => item.status_produksi === 'in_progress'
      ).length;
      const draftSuratJalanCount = suratJalanRows.filter(
        (sj) => sj.status === 'draft'
      ).length;
      const hasAvailableShipments = items.some(
        (item) => item.available_shipments.length > 0
      );

      const canComplete =
        po.status_po === 'in_production' &&
        pendingItemsCount === 0 &&
        inProgressItemsCount === 0;

      const availableActions = [];

      if (po.status_po === 'draft') {
        availableActions.push({
          key: 'approve',
          label: 'Approve PO'
        });
        availableActions.push({
          key: 'cancel',
          label: 'Batalkan PO'
        });
      }

      if (po.status_po === 'approved') {
        availableActions.push({
          key: 'start_production',
          label: 'Mulai Progress & Pengiriman'
        });
        availableActions.push({
          key: 'cancel',
          label: 'Batalkan PO'
        });
      }

      if (po.status_po === 'in_production') {
        if (canComplete) {
          availableActions.push({
            key: 'complete_production',
            label: 'Selesaikan Produksi'
          });
        }
        availableActions.push({
          key: 'close_do',
          label: 'Tutup DO'
        });
      }

      if (po.status_po === 'completed') {
        availableActions.push({
          key: 'close_do',
          label: 'Tutup DO'
        });
      }

      if (po.status_po === 'cancelled') {
        availableActions.push({
          key: 'reactivate',
          label: 'Aktifkan Kembali'
        });
      }

      const uiState = {
        pending_items: pendingItemsCount,
        in_progress_items: inProgressItemsCount,
        draft_surat_jalan: draftSuratJalanCount,
        can_complete: canComplete,
        has_available_shipments: hasAvailableShipments
      };

      res.json({
        success: true,
        data: {
          id: po.id,
          nomor_po: po.nomor_po,
          status_po: po.status_po,
          status_meta: statusMeta,
          prioritas: po.prioritas,
          priority_meta: priorityMeta,
          tanggal_po: po.tanggal_po,
          target_selesai: po.target_selesai,
          catatan: po.catatan,
          gudang_utama: {
            id: po.gudang_utama,
            nama: po.gudang_utama_nama,
            lokasi: po.gudang_utama_lokasi
          },
          penawaran: {
            nomor_penawaran: po.nomor_penawaran,
            judul_penawaran: po.judul_penawaran,
            grand_total: Number(po.grand_total || 0)
          },
          client: {
            nama: po.client_nama,
            nama_perusahaan: po.client_perusahaan
          },
          creator: {
            id: po.created_by,
            name: po.creator_name
          },
          approver: {
            id: po.approved_by,
            name: po.approver_name,
            approved_at: po.approved_at
          },
          summary: {
            total_qty_target: totalQtyTarget,
            total_qty_completed: totalCompleted,
            total_qty_remaining: totalQtyRemaining,
            total_qty_shipped: totalShipped,
            total_sisa_belum_terkirim: totalSisaBelumTerkirim,
            progress_pengiriman: overallProgress
          },
          stats: {
            total_items: items.length,
            completed_items: items.filter(
              (item) => item.status_produksi === 'completed'
            ).length,
            in_progress_items: items.filter(
              (item) => item.status_produksi === 'in_progress'
            ).length,
            pending_items: items.filter(
              (item) => item.status_produksi === 'pending'
            ).length
          },
          items,
          surat_jalan: suratJalanRows,
          available_actions: availableActions,
          ui_state: uiState,
          gudangs: gudangRows,
          user_gudang_ids: userGudangIds
        }
      });
    } catch (error) {
      console.error('Error gudang purchase order detail:', error);
      const statusCode = error.status || 500;
      res.status(statusCode).json({
        success: false,
        message:
          error.message ||
          (statusCode === 403
            ? 'Anda tidak memiliki akses'
            : 'Internal server error')
      });
    }
  }

  async approve(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { po } = await checkPoAccess(id, userId);
      if (po.status_po !== 'draft') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status draft yang dapat diapprove.'
        });
      }

      const timestamp = nowWib();
      await db.execute(
        `
          UPDATE purchase_orders
          SET status_po = 'approved',
              approved_by = ?,
              approved_at = ?,
              updated_at = ?
          WHERE id = ?
        `,
        [userId, timestamp, timestamp, id]
      );

      res.json({
        success: true,
        message: 'Purchase Order berhasil diapprove.'
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal approve Purchase Order.');
    }
  }

  async startProduction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { po } = await checkPoAccess(id, userId);
      if (po.status_po !== 'approved') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status approved yang dapat memulai produksi.'
        });
      }

      const timestamp = nowWib();
      await db.execute(
        `
          UPDATE purchase_orders
          SET status_po = 'in_production',
              updated_at = ?
          WHERE id = ?
        `,
        [timestamp, id]
      );

      res.json({
        success: true,
        message: 'Produksi Purchase Order telah dimulai.'
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal memulai produksi.');
    }
  }

  async completeProduction(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { po } = await checkPoAccess(id, userId);
      if (po.status_po !== 'in_production') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status in_production yang dapat diselesaikan.'
        });
      }

      const [[pendingResult]] = await db.execute(
        `
          SELECT 
            SUM(CASE WHEN status_produksi = 'pending' THEN 1 ELSE 0 END) AS pending_count,
            SUM(CASE WHEN status_produksi = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_count
          FROM po_items
          WHERE id_po = ? AND status_deleted = 0
        `,
        [id]
      );

      const pendingCount = Number(pendingResult.pending_count || 0);
      const inProgressCount = Number(pendingResult.in_progress_count || 0);

      if (pendingCount > 0 || inProgressCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Tidak dapat menyelesaikan produksi. Masih ada ${pendingCount} item pending dan ${inProgressCount} item in progress.`
        });
      }

      const timestamp = nowWib();
      await db.execute(
        `
          UPDATE purchase_orders
          SET status_po = 'completed',
              updated_at = ?
          WHERE id = ?
        `,
        [timestamp, id]
      );

      res.json({
        success: true,
        message: 'Produksi Purchase Order telah selesai.'
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal menyelesaikan produksi.');
    }
  }

  async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { po } = await checkPoAccess(id, userId);
      if (['completed', 'cancelled', 'closed'].includes(po.status_po)) {
        return res.status(400).json({
          success: false,
          message: 'PO dengan status tersebut tidak dapat dibatalkan.'
        });
      }

      const timestamp = nowWib();
      await db.execute(
        `
          UPDATE purchase_orders
          SET status_po = 'cancelled',
              cancelled_by = ?,
              cancelled_at = ?,
              updated_at = ?
          WHERE id = ?
        `,
        [userId, timestamp, timestamp, id]
      );

      res.json({
        success: true,
        message: 'Purchase Order berhasil dibatalkan.'
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal membatalkan Purchase Order.');
    }
  }

  async reactivate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { po } = await checkPoAccess(id, userId);
      if (po.status_po !== 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Hanya PO dengan status cancelled yang dapat diaktifkan kembali.'
        });
      }

      const timestamp = nowWib();
      await db.execute(
        `
          UPDATE purchase_orders
          SET status_po = 'draft',
              cancelled_by = NULL,
              cancelled_at = NULL,
              updated_at = ?
          WHERE id = ?
        `,
        [timestamp, id]
      );

      res.json({
        success: true,
        message: 'Purchase Order berhasil diaktifkan kembali.'
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal mengaktifkan kembali Purchase Order.');
    }
  }

  async close(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const { po } = await checkPoAccess(id, userId);
      if (!['in_production', 'completed'].includes(po.status_po)) {
        return res.status(400).json({
          success: false,
          message: 'DO hanya dapat ditutup ketika status in_production atau completed.'
        });
      }

      const timestamp = nowWib();
      await db.execute(
        `
          UPDATE purchase_orders
          SET status_po = 'closed',
              updated_at = ?
          WHERE id = ?
        `,
        [timestamp, id]
      );

      res.json({
        success: true,
        message: 'Delivery Order berhasil ditutup.'
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal menutup Delivery Order.');
    }
  }

  async updateItemProgress(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user.id;
      const { qty_completed: qtyCompletedRaw, catatan } = req.body;

      const item = await getPoItemById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item tidak ditemukan.'
        });
      }

      const purchaseOrder = await getPurchaseOrderById(item.id_po);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan.'
        });
      }

      await checkTransferAccess(purchaseOrder, userId);

      const qtyCompleted = Number(qtyCompletedRaw);
      if (!Number.isInteger(qtyCompleted) || qtyCompleted < 0) {
        return res.status(400).json({
          success: false,
          message: 'Qty progress harus berupa angka bulat positif.'
        });
      }
      if (qtyCompleted > Number(item.qty)) {
        return res.status(400).json({
          success: false,
          message: `Qty progress tidak boleh melebihi target item (${item.qty}).`
        });
      }

      if (catatan && String(catatan).length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Catatan maksimal 500 karakter.'
        });
      }

      const latestProgress = await getLatestProgressByItem(item.id);
      const currentProgress = latestProgress.find(
        (progress) => progress.gudang_id === item.id_gudang
      );
      const currentGudangQty = currentProgress
        ? Number(currentProgress.qty_completed || 0)
        : 0;
      const otherGudangTotal = latestProgress
        .filter((progress) => progress.gudang_id !== item.id_gudang)
        .reduce(
          (sum, progress) => sum + Number(progress.qty_completed || 0),
          0
        );

      const totalProgressAfterUpdate = otherGudangTotal + qtyCompleted;
      if (totalProgressAfterUpdate > Number(item.qty)) {
        const maxAllowed = Number(item.qty) - otherGudangTotal;
        return res.status(400).json({
          success: false,
          message: `Total progress melebihi target qty. Maksimal yang dapat diinput: ${maxAllowed}.`
        });
      }

      const isTransferredGudang = currentProgress
        ? (currentProgress.catatan || '')
            .toLowerCase()
            .includes('transfer dari')
        : false;

      if (isTransferredGudang) {
        const currentTotalProgress = latestProgress.reduce(
          (sum, progress) => sum + Number(progress.qty_completed || 0),
          0
        );
        const maxQtyForTransferred =
          Number(item.qty) - currentTotalProgress + currentGudangQty;
        if (qtyCompleted > maxQtyForTransferred) {
          return res.status(400).json({
            success: false,
            message: `Gudang ini hasil transfer. Maksimal qty yang dapat diinput: ${maxQtyForTransferred}.`
          });
        }
      }

      const qtyTarget =
        isTransferredGudang && currentProgress
          ? Number(currentProgress.qty_target || item.qty)
          : Number(item.qty);

      const timestamp = nowWib();
      await db.execute(
        `
          INSERT INTO production_progress (
            po_item_id,
            gudang_id,
            qty_completed,
            qty_target,
            catatan,
            updated_by,
            progress_date,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          item.id_gudang,
          qtyCompleted,
          qtyTarget,
          catatan || null,
          userId,
          timestamp,
          timestamp,
          timestamp
        ]
      );

      const totalCompleted = await sumLatestProgress(item.id);
      let newStatus = 'pending';
      if (totalCompleted >= Number(item.qty)) {
        newStatus = 'completed';
      } else if (totalCompleted > 0) {
        newStatus = 'in_progress';
      }

      await db.execute(
        `
          UPDATE po_items
          SET status_produksi = ?,
              started_at = CASE
                WHEN ? <> 'pending' AND (started_at IS NULL OR started_at = '0000-00-00 00:00:00')
                THEN ?
                ELSE started_at
              END,
              completed_at = CASE
                WHEN ? = 'completed' THEN ?
                ELSE completed_at
              END,
              updated_at = ?
          WHERE id = ?
        `,
        [
          newStatus,
          newStatus,
          timestamp,
          newStatus,
          newStatus === 'completed' ? timestamp : null,
          timestamp,
          item.id
        ]
      );

      const percentage =
        Number(item.qty) > 0
          ? Math.round((totalCompleted / Number(item.qty)) * 100)
          : 0;

      res.json({
        success: true,
        message: 'Progress produksi berhasil diperbarui.',
        data: {
          item_id: item.id,
          qty_completed: qtyCompleted,
          total_completed: totalCompleted,
          percentage,
          status_produksi: newStatus
        }
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal memperbarui progress item.');
    }
  }

  async transferProgress(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user.id;
      const {
        from_gudang_id: fromGudangIdRaw,
        to_gudang_id: toGudangIdRaw,
        qty_to_transfer: qtyToTransferRaw,
        catatan
      } = req.body;

      const fromGudangId = Number(fromGudangIdRaw);
      const toGudangId = Number(toGudangIdRaw);
      const qtyToTransfer = Number(qtyToTransferRaw);

      console.log('[transferProgress] incoming request', {
        itemId,
        userId,
        from_gudang_id: fromGudangId,
        to_gudang_id: toGudangId,
        qty_to_transfer: qtyToTransfer,
        catatan
      });

      if (!Number.isInteger(fromGudangId) || !Number.isInteger(toGudangId)) {
        return res.status(400).json({
          success: false,
          message: 'Gudang asal dan tujuan harus valid.'
        });
      }
      if (fromGudangId === toGudangId) {
        return res.status(400).json({
          success: false,
          message: 'Gudang asal dan tujuan tidak boleh sama.'
        });
      }
      if (!Number.isInteger(qtyToTransfer) || qtyToTransfer <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Qty transfer harus lebih dari 0.'
        });
      }

      const item = await getPoItemById(itemId);
      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item tidak ditemukan.'
        });
      }

      const purchaseOrder = await getPurchaseOrderById(item.id_po);
      if (!purchaseOrder) {
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan.'
        });
      }

      await checkTransferAccess(purchaseOrder, userId);

      const latestProgress = await getLatestProgressByItem(item.id);
      const fromProgress = latestProgress.find(
        (progress) =>
          Number(progress.gudang_id || 0) === Number(fromGudangId || 0)
      );
      const hasFromProgress = !!fromProgress;

      if (!hasFromProgress) {
        console.log('[transferProgress] no progress found for source gudang', {
          itemId,
          from_gudang_id: fromGudangId,
          latestProgress
        });
      }

      if (
        hasFromProgress &&
        (fromProgress.catatan || '').toLowerCase().includes('transfer dari')
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Gudang asal adalah hasil transfer. Tidak dapat melakukan transfer lagi.'
        });
      }

      const currentTotalProgress = latestProgress.reduce(
        (sum, progress) => sum + Number(progress.qty_completed || 0),
        0
      );
      const remainingQty = Number(item.qty) - currentTotalProgress;

      console.log('[transferProgress] computed state', {
        item_qty: Number(item.qty),
        currentTotalProgress,
        remainingQty,
        hasFromProgress
      });

      if (qtyToTransfer > remainingQty) {
        return res.status(400).json({
          success: false,
          message: `Qty transfer melebihi sisa progres yang belum selesai. Sisa: ${remainingQty}.`
        });
      }

      const timestamp = nowWib();
      const [[fromGudang]] = await db.execute(
        `
          SELECT nama
          FROM gudang
          WHERE id = ?
        `,
        [fromGudangId]
      );
      const [[toGudang]] = await db.execute(
        `
          SELECT nama
          FROM gudang
          WHERE id = ?
        `,
        [toGudangId]
      );

      const fromGudangName = fromGudang ? fromGudang.nama : 'Gudang Asal';
      const toGudangName = toGudang ? toGudang.nama : 'Gudang Tujuan';

      if (hasFromProgress) {
        await db.execute(
          `
            UPDATE production_progress
            SET catatan = ?,
                updated_by = ?,
                progress_date = ?,
                updated_at = ?
            WHERE id = ?
          `,
          [
            `Transfer sisa produksi ke ${toGudangName}${
              catatan ? `: ${catatan}` : ''
            }`,
            userId,
            timestamp,
            timestamp,
            fromProgress.id
          ]
        );
      } else {
        await db.execute(
          `
            INSERT INTO production_progress (
              po_item_id,
              gudang_id,
              qty_completed,
              qty_target,
              catatan,
              updated_by,
              progress_date,
              created_at,
              updated_at
            ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?)
          `,
          [
            item.id,
            fromGudangId,
            qtyToTransfer,
            `Dialihkan ke ${toGudangName}${catatan ? `: ${catatan}` : ''}`,
            userId,
            timestamp,
            timestamp,
            timestamp
          ]
        );
      }

      await db.execute(
        `
          INSERT INTO production_progress (
            po_item_id,
            gudang_id,
            qty_completed,
            qty_target,
            catatan,
            updated_by,
            progress_date,
            created_at,
            updated_at
          ) VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?)
        `,
        [
          item.id,
          toGudangId,
          qtyToTransfer,
          `Transfer dari ${fromGudangName} (${qtyToTransfer} qty)${
            catatan ? `: ${catatan}` : ''
          }`,
          userId,
          timestamp,
          timestamp,
          timestamp
        ]
      );

      await db.execute(
        `
          UPDATE po_items
          SET id_gudang = ?,
              updated_at = ?
          WHERE id = ?
        `,
        [toGudangId, timestamp, item.id]
      );

      const totalCompleted = await sumLatestProgress(item.id);
      let newStatus = 'pending';
      if (totalCompleted >= Number(item.qty)) {
        newStatus = 'completed';
      } else if (totalCompleted > 0) {
        newStatus = 'in_progress';
      }

      await db.execute(
        `
          UPDATE po_items
          SET status_produksi = ?,
              updated_at = ?
          WHERE id = ?
        `,
        [newStatus, timestamp, item.id]
      );

      res.json({
        success: true,
        message: 'Progress berhasil ditransfer antar gudang.',
        data: {
          item_id: item.id,
          qty_transferred: qtyToTransfer,
          from_gudang: fromGudangName,
          to_gudang: toGudangName,
          status_produksi: newStatus
        }
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal mentransfer progress.');
    }
  }

  async createSuratJalan(req, res) {
    const connection = await db.getConnection();

    try {
      const { id } = req.params;
      const userId = req.user.id;
      const {
        tanggal_pengiriman: tanggalPengiriman,
        alamat_tujuan: alamatTujuan,
        catatan,
        selected_progress: selectedProgressRaw
      } = req.body;

      if (!tanggalPengiriman) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Tanggal pengiriman wajib diisi.'
        });
      }

      if (!alamatTujuan || !alamatTujuan.trim()) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Alamat tujuan wajib diisi.'
        });
      }

      if (
        !Array.isArray(selectedProgressRaw) ||
        selectedProgressRaw.length === 0
      ) {
        connection.release();
        return res.status(400).json({
          success: false,
          message: 'Minimal pilih satu progress yang akan dikirim.'
        });
      }

      const purchaseOrder = await getPurchaseOrderById(id);
      if (!purchaseOrder) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Purchase Order tidak ditemukan.'
        });
      }

      await checkTransferAccess(purchaseOrder, userId);

      const [poInfoRows] = await db.execute(
        `
          SELECT 
            po.id,
            po.nomor_po,
            po.gudang_utama,
            po.id_penawaran,
            p.nomor_penawaran,
            p.judul_penawaran,
            c.nama AS client_nama
          FROM purchase_orders po
          LEFT JOIN penawaran p ON po.id_penawaran = p.id
          LEFT JOIN clients c ON p.id_client = c.id
          WHERE po.id = ?
        `,
        [id]
      );

      if (!poInfoRows.length) {
        connection.release();
        return res.status(404).json({
          success: false,
          message: 'Informasi Purchase Order tidak ditemukan.'
        });
      }

      const poInfo = poInfoRows[0];

      const [itemRows] = await db.execute(
        `
          SELECT poi.*, g.nama AS gudang_nama
          FROM po_items poi
          LEFT JOIN gudang g ON poi.id_gudang = g.id
          WHERE poi.id_po = ? AND poi.status_deleted = 0
        `,
        [id]
      );

      const itemIds = itemRows.map((row) => row.id);
      let progressRows = [];
      if (itemIds.length) {
        const placeholders = itemIds.map(() => '?').join(',');
        const [rows] = await db.execute(
          `
            SELECT 
              pp.*,
              g.nama AS gudang_nama,
              g.lokasi AS gudang_lokasi
            FROM production_progress pp
            LEFT JOIN gudang g ON pp.gudang_id = g.id
            WHERE pp.po_item_id IN (${placeholders})
            ORDER BY pp.progress_date DESC, pp.id DESC
          `,
          itemIds
        );
        progressRows = rows;
      }

      const latestMap = buildLatestProgressMap(progressRows);

      const [suratJalanRows] = await db.execute(
        `
          SELECT json
          FROM surat_jalan
          WHERE purchase_order_id = ? AND deleted_status = 0
        `,
        [id]
      );

      const shippedQtyMap = {};
      suratJalanRows.forEach((row) => {
        const items = safeJSONParse(row.json) || [];
        items.forEach((item) => {
          const key = `${item.gudang_id}_${item.item_id}`;
          shippedQtyMap[key] = (shippedQtyMap[key] || 0) + Number(item.qty_kirim || 0);
        });
      });

      const progressAvailabilityMap = {};
      itemRows.forEach((itemRow) => {
        const produkData = safeJSONParse(itemRow.produk_data) || {};
        const baseName =
          produkData.item || itemRow.nama_produk || 'Produk Tidak Diketahui';
        const progressEntries = Object.values(latestMap).filter(
          (progress) => progress.po_item_id === itemRow.id
        );

        progressEntries.forEach((progress) => {
          const key = `${progress.gudang_id}_${itemRow.id}`;
          const qtyCompleted = Number(progress.qty_completed || 0);
          const alreadyShipped = shippedQtyMap[key] || 0;
          const availableQty = Math.max(0, qtyCompleted - alreadyShipped);

          if (availableQty > 0) {
            progressAvailabilityMap[key] = {
              item: itemRow,
              produk_data: produkData,
              progress,
              available_qty: availableQty,
              already_shipped: alreadyShipped,
              key
            };
          }
        });
      });

      const selectedItems = [];
      selectedProgressRaw.forEach((entry) => {
        const itemId = Number(entry.item_id);
        const gudangId = Number(entry.gudang_id);
        const requestedQty = Number(
          entry.qty_kirim !== undefined ? entry.qty_kirim : undefined
        );

        if (!Number.isInteger(itemId) || !Number.isInteger(gudangId)) {
          throw Object.assign(new Error('Format progress tidak valid.'), {
            status: 400
          });
        }

        const key = `${gudangId}_${itemId}`;
        const available = progressAvailabilityMap[key];
        if (!available) {
          throw Object.assign(
            new Error('Progress yang dipilih tidak tersedia atau sudah dikirim.'),
            { status: 400 }
          );
        }

        const effectiveQty =
          Number.isFinite(requestedQty) && requestedQty > 0
            ? requestedQty
            : available.available_qty;

        if (effectiveQty > available.available_qty) {
          throw Object.assign(
            new Error(
              `Qty kirim untuk ${available.produk_data.item || available.item.nama_produk
              } melebihi qty tersedia (${available.available_qty}).`
            ),
            { status: 400 }
          );
        }

        selectedItems.push({
          key,
          item: available.item,
          progress: available.progress,
          produk_data: available.produk_data,
          qty_kirim: effectiveQty
        });
      });

      if (!selectedItems.length) {
        throw Object.assign(
          new Error('Tidak ada progress valid yang dipilih.'),
          { status: 400 }
        );
      }

      await connection.beginTransaction();

      const nomorSurat = await generateNomorSuratJalan(purchaseOrder);
      const userName = await getUserName(userId);
      const timestamp = nowWib();

      const itemsPayload = selectedItems.map(({ item, progress, qty_kirim }) => ({
        item_id: item.id,
        nama_produk:
          (item.produk_data && safeJSONParse(item.produk_data)?.item) ||
          item.nama_produk ||
          'Produk',
        qty_target: Number(item.qty),
        qty_selesai: Number(progress.qty_completed || 0),
        qty_kirim,
        gudang: progress.gudang_nama,
        gudang_id: progress.gudang_id
      }));

      await connection.execute(
        `
          INSERT INTO surat_jalan (
            nomor_surat,
            no_po,
            no_spp,
            keterangan,
            tujuan,
            proyek,
            penerima,
            json,
            author,
            pengirim,
            security,
            diketahui,
            disetujui,
            diterima,
            tanggal_pengiriman,
            bukti_dokumentasi,
            purchase_order_id,
            status,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          nomorSurat,
          poInfo.nomor_po,
          poInfo.nomor_penawaran,
          catatan || 'Surat Jalan dari Purchase Order',
          alamatTujuan,
          poInfo.client_nama,
          poInfo.client_nama,
          JSON.stringify(itemsPayload),
          userId,
          userName,
          'Security',
          'Diketahui',
          'Disetujui',
          'Diterima',
          tanggalPengiriman,
          JSON.stringify([]),
          poInfo.id,
          'draft',
          timestamp,
          timestamp
        ]
      );

      await connection.commit();

      res.json({
        success: true,
        message: 'Surat Jalan berhasil dibuat.',
        data: {
          nomor_surat: nomorSurat,
          total_items: itemsPayload.length,
          items: itemsPayload
        }
      });
    } catch (error) {
      try {
        await connection.rollback();
      } catch (_) {
        // ignore rollback error
      }
      handleControllerError(res, error, 'Gagal membuat Surat Jalan.');
    } finally {
      connection.release();
    }
  }

  async getSuratJalanDetail(req, res) {
    try {
      const { id } = req.params;

      const [rows] = await db.execute(
        `
          SELECT 
            sj.*, 
            u.name AS author_name,
            po.id AS purchase_order_id,
            po.nomor_po,
            pen.nomor_penawaran,
            pen.judul_penawaran,
            c.nama AS client_nama,
            k.id AS kop_surat_id,
            k.title_header AS kop_surat_title,
            k.alamat AS kop_surat_alamat,
            k.notelp AS kop_surat_notelp,
            k.fax AS kop_surat_fax,
            k.email AS kop_surat_email,
            k.logo AS kop_surat_logo
          FROM surat_jalan sj
          LEFT JOIN users u ON sj.author = u.id
          LEFT JOIN purchase_orders po ON sj.purchase_order_id = po.id
          LEFT JOIN penawaran pen ON po.id_penawaran = pen.id
          LEFT JOIN clients c ON pen.id_client = c.id
          LEFT JOIN kop_surat k ON pen.kop_surat_id = k.id
          WHERE sj.id = ? AND sj.deleted_status = 0
        `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Surat jalan tidak ditemukan.'
        });
      }

      const suratJalan = rows[0];
      const itemsRaw = safeJSONParse(suratJalan.json) || [];
      const dokumentasiRaw = safeJSONParse(suratJalan.bukti_dokumentasi) || [];
      const statusMeta =
        SURAT_JALAN_STATUS_META[suratJalan.status] ||
        SURAT_JALAN_STATUS_META.default;

      const items = itemsRaw.map((item, index) => ({
        index,
        item_id: Number(item.item_id || 0),
        nama_produk: item.nama_produk || 'Produk',
        qty_target: Number(item.qty_target || 0),
        qty_selesai: Number(item.qty_selesai || 0),
        qty_kirim: Number(item.qty_kirim || 0),
        gudang: item.gudang || '-',
        gudang_id: Number(item.gudang_id || 0)
      }));

      const dokumentasi = dokumentasiRaw.map((doc, index) => ({
        index,
        filename: doc?.filename || `File ${index + 1}`,
        path: doc?.path || null,
        uploaded_at: doc?.uploaded_at || null,
        catatan: doc?.catatan || null
      }));

      const totalQtyKirim = items.reduce(
        (sum, item) => sum + Number(item.qty_kirim || 0),
        0
      );

      // Build kop_surat object (SAMA KAYAK PENAWARAN - copy exact dari penawaranController.js line 149-156)
      const kopSurat = {
        title_header: suratJalan.kop_surat_title || '',
        alamat: suratJalan.kop_surat_alamat || '',
        notelp: suratJalan.kop_surat_notelp || '',
        fax: suratJalan.kop_surat_fax || '',
        email: suratJalan.kop_surat_email || '',
        logo: suratJalan.kop_surat_logo || null,
      };

      // Build penawaran object with kop_surat (SAMA KAYAK ENDPOINT SALES)
      const penawaranData = {
        nomor_penawaran: suratJalan.nomor_penawaran,
        judul_penawaran: suratJalan.judul_penawaran,
        kop_surat: kopSurat,
        client: {
          nama: suratJalan.client_nama || '',
          nama_perusahaan: suratJalan.client_nama || ''
        }
      };

      res.json({
        success: true,
        data: {
          id: suratJalan.id,
          nomor_surat: suratJalan.nomor_surat,
          status: suratJalan.status,
          status_meta: statusMeta,
          status_text: statusMeta.text,
          tanggal_pengiriman: suratJalan.tanggal_pengiriman,
          created_at: suratJalan.created_at,
          updated_at: suratJalan.updated_at,
          catatan: suratJalan.keterangan,
          tujuan: suratJalan.tujuan,
          proyek: suratJalan.proyek,
          penerima: suratJalan.penerima,
          author: {
            id: suratJalan.author,
            name: suratJalan.author_name || null
          },
          purchase_order: {
            id: suratJalan.purchase_order_id,
            nomor_po: suratJalan.nomor_po,
            nomor_penawaran: suratJalan.nomor_penawaran,
            judul_penawaran: suratJalan.judul_penawaran,
            client: suratJalan.client_nama,
            penawaran: penawaranData // Add penawaran with kop_surat di dalam purchase_order (SAMA KAYAK STRUKTUR RELASI)
          },
          penawaran: penawaranData, // Add penawaran with kop_surat di root juga (SAMA KAYAK ENDPOINT SALES)
          summary: {
            total_items: items.length,
            total_qty_kirim: totalQtyKirim
          },
          items,
          dokumentasi
        }
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal mengambil detail surat jalan.');
    }
  }

  async uploadSuratJalanDokumentasi(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const files = req.files || [];
      const catatan =
        req.body?.catatan_pengiriman || req.body?.catatan || null;

      if (!Number.isInteger(Number(id))) {
        return res.status(400).json({
          success: false,
          message: 'ID surat jalan tidak valid.'
        });
      }

      if (!files.length) {
        return res.status(400).json({
          success: false,
          message: 'Minimal unggah satu file dokumentasi.'
        });
      }

      const [rows] = await db.execute(
        `
          SELECT id, purchase_order_id, bukti_dokumentasi, status
          FROM surat_jalan
          WHERE id = ? AND deleted_status = 0
        `,
        [id]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: 'Surat jalan tidak ditemukan.'
        });
      }

      const suratJalan = rows[0];

      await checkPoAccess(suratJalan.purchase_order_id, userId);

      const existingDokumentasi =
        safeJSONParse(suratJalan.bukti_dokumentasi) || [];
      const timestamp = nowWib();

      const newDokumentasi = files.map((file) =>
        buildDokumentasiPayload({
          file,
          suratJalanId: id,
          timestamp,
          userId,
          catatan
        })
      );

      const combinedDokumentasi = [...existingDokumentasi, ...newDokumentasi];
      const nextStatus =
        suratJalan.status === 'draft' ? 'terkirim' : suratJalan.status;

      await db.execute(
        `
          UPDATE surat_jalan
          SET bukti_dokumentasi = ?,
              status = ?,
              updated_at = ?
          WHERE id = ?
        `,
        [JSON.stringify(combinedDokumentasi), nextStatus, timestamp, id]
      );

      res.json({
        success: true,
        message: 'Dokumentasi berhasil diupload.',
        data: {
          id: Number(id),
          status: nextStatus,
          dokumentasi: combinedDokumentasi
        }
      });
    } catch (error) {
      handleControllerError(res, error, 'Gagal mengupload dokumentasi.');
    }
  }
  }

  async getSuratJalanList(req, res) {
    try {
      const { search, status } = req.query;
      
      let query = `
        SELECT 
          sj.*, 
          po.nomor_po, po.id as po_id, po.gudang_utama,
          pen.nomor_penawaran, pen.judul_penawaran,
          c.nama as client_nama, c.nama_perusahaan as client_perusahaan,
          g.nama as gudang_nama
        FROM surat_jalan sj
        LEFT JOIN purchase_orders po ON sj.purchase_order_id = po.id
        LEFT JOIN penawaran pen ON po.id_penawaran = pen.id
        LEFT JOIN clients c ON pen.id_client = c.id
        LEFT JOIN gudang g ON po.gudang_utama = g.id
        WHERE sj.deleted_status = 0
      `;
      
      const params = [];
      
      // Search functionality
      if (search) {
        query += ` AND (sj.nomor_surat LIKE ? OR po.nomor_po LIKE ? OR pen.judul_penawaran LIKE ? OR c.nama LIKE ?)`;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      // Filter by status
      if (status !== undefined && status !== '') {
        query += ` AND sj.status = ?`;
        params.push(status);
      }
      
      query += ` ORDER BY sj.created_at DESC LIMIT 100`;
      
      const [suratJalanData] = await db.execute(query, params);
      
      res.json({
        success: true,
        data: suratJalanData || []
      });
    } catch (error) {
      console.error('Error in gudang surat jalan list:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new GudangPurchaseOrderController();

