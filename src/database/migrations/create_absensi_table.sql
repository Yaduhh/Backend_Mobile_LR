CREATE TABLE IF NOT EXISTS absensi (
  id INT PRIMARY KEY AUTO_INCREMENT,
  status_absen ENUM('masuk', 'pulang', 'izin', 'sakit') NOT NULL,
  tgl_absen DATETIME NOT NULL,
  id_user INT NOT NULL,
  id_daily_activity INT,
  deleted_status BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (id_user) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (id_daily_activity) REFERENCES daily_activities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 