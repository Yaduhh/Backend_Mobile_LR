-- Create po_items table
CREATE TABLE IF NOT EXISTS po_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  id_po INT NOT NULL,
  id_gudang INT NOT NULL,
  produk_data JSON,
  qty INT NOT NULL DEFAULT 1,
  harga DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  total_harga DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  status_produksi ENUM('pending', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  prioritas ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  target_selesai DATE,
  catatan TEXT,
  assigned_to INT,
  started_at DATETIME,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  status_deleted TINYINT(1) DEFAULT 0,
  
  INDEX idx_po (id_po),
  INDEX idx_gudang (id_gudang),
  INDEX idx_status (status_produksi),
  INDEX idx_prioritas (prioritas),
  INDEX idx_assigned (assigned_to),
  INDEX idx_deleted (status_deleted),
  
  FOREIGN KEY (id_po) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (id_gudang) REFERENCES gudang(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 