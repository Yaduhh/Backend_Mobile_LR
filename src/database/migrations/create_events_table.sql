-- Migration: Create events table
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