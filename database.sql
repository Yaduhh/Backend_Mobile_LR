-- Buat database
CREATE DATABASE IF NOT EXISTS sistem_mki;
USE sistem_mki;

-- Buat tabel users
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role INT NOT NULL DEFAULT 2, -- 1: admin, 2: user
  notelp VARCHAR(20),
  profile TEXT,
  status TINYINT NOT NULL DEFAULT 1, -- 1: aktif, 0: tidak aktif
  status_deleted TINYINT NOT NULL DEFAULT 0, -- 0: tidak dihapus, 1: dihapus
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert admin default
INSERT INTO users (name, email, password, role, notelp, profile, status, status_deleted)
VALUES (
  'Admin',
  'admin@mki.com',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password (bcrypt)
  1,
  '08123456789',
  'Admin MKI',
  1,
  0
);

-- Tabel events
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_event VARCHAR(255) NOT NULL,
    jadwal DATETIME NOT NULL,
    location TEXT,
    deskripsi TEXT,
    peserta JSON,
    created_by INT NOT NULL,
    status ENUM('active', 'cancelled', 'completed') DEFAULT 'active',
    status_deleted TINYINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Index untuk optimasi query
CREATE INDEX idx_events_jadwal ON events(jadwal);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_created_by ON events(created_by);
CREATE INDEX idx_events_status_deleted ON events(status_deleted); 