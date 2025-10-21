const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  let connection;
  
  try {
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'sistem_mki',
      multipleStatements: true
    });

    console.log('Connected to database successfully!');

    // Create purchase_orders table
    const createPurchaseOrdersTable = `
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_penawaran INT NOT NULL,
        nomor_po VARCHAR(50) NOT NULL UNIQUE,
        tanggal_po DATETIME NOT NULL,
        gudang_utama INT NOT NULL,
        status_po ENUM('draft', 'approved', 'in_production', 'completed', 'cancelled') DEFAULT 'draft',
        prioritas ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        catatan TEXT,
        target_selesai DATE,
        approved_by INT,
        approved_at DATETIME,
        cancelled_by INT,
        cancelled_at DATETIME,
        created_by INT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        status_deleted TINYINT(1) DEFAULT 0,
        
        INDEX idx_penawaran (id_penawaran),
        INDEX idx_status (status_po),
        INDEX idx_prioritas (prioritas),
        INDEX idx_created_by (created_by),
        INDEX idx_approved_by (approved_by),
        INDEX idx_cancelled_by (cancelled_by),
        INDEX idx_gudang (gudang_utama),
        INDEX idx_deleted (status_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createPurchaseOrdersTable);
    console.log('✅ purchase_orders table created successfully!');

    // Create po_items table
    const createPoItemsTable = `
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
        INDEX idx_deleted (status_deleted)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await connection.execute(createPoItemsTable);
    console.log('✅ po_items table created successfully!');

    // Add foreign key constraints if they don't exist
    try {
      await connection.execute(`
        ALTER TABLE purchase_orders 
        ADD CONSTRAINT fk_po_penawaran 
        FOREIGN KEY (id_penawaran) REFERENCES penawaran(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added: purchase_orders -> penawaran');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Foreign key constraint already exists: purchase_orders -> penawaran');
      } else {
        console.log('⚠️  Could not add foreign key constraint: purchase_orders -> penawaran');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE purchase_orders 
        ADD CONSTRAINT fk_po_gudang 
        FOREIGN KEY (gudang_utama) REFERENCES gudang(id) ON DELETE RESTRICT
      `);
      console.log('✅ Foreign key constraint added: purchase_orders -> gudang');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Foreign key constraint already exists: purchase_orders -> gudang');
      } else {
        console.log('⚠️  Could not add foreign key constraint: purchase_orders -> gudang');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE purchase_orders 
        ADD CONSTRAINT fk_po_created_by 
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      `);
      console.log('✅ Foreign key constraint added: purchase_orders -> users (created_by)');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Foreign key constraint already exists: purchase_orders -> users (created_by)');
      } else {
        console.log('⚠️  Could not add foreign key constraint: purchase_orders -> users (created_by)');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE po_items 
        ADD CONSTRAINT fk_poi_po 
        FOREIGN KEY (id_po) REFERENCES purchase_orders(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key constraint added: po_items -> purchase_orders');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Foreign key constraint already exists: po_items -> purchase_orders');
      } else {
        console.log('⚠️  Could not add foreign key constraint: po_items -> purchase_orders');
      }
    }

    try {
      await connection.execute(`
        ALTER TABLE po_items 
        ADD CONSTRAINT fk_poi_gudang 
        FOREIGN KEY (id_gudang) REFERENCES gudang(id) ON DELETE RESTRICT
      `);
      console.log('✅ Foreign key constraint added: po_items -> gudang');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Foreign key constraint already exists: po_items -> gudang');
      } else {
        console.log('⚠️  Could not add foreign key constraint: po_items -> gudang');
      }
    }

    console.log('\n🎉 Migration completed successfully!');
    console.log('📋 Tables created:');
    console.log('   - purchase_orders');
    console.log('   - po_items');
    console.log('\n🚀 Purchase Order feature is ready to use!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed.');
    }
  }
}

// Run migration
runMigration(); 