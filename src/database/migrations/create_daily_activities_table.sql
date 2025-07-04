CREATE TABLE IF NOT EXISTS daily_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    dokumentasi JSON,
    perihal VARCHAR(255) NOT NULL,
    pihak_bersangkutan INT,
    komentar JSON,
    summary TEXT,
    lokasi VARCHAR(255),
    deleted_status BOOLEAN DEFAULT FALSE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pihak_bersangkutan) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 