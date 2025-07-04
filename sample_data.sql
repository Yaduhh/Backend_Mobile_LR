-- Sample data untuk testing events
USE sistem_mki;

-- Insert sample users
INSERT INTO users (name, email, password, role, notelp, profile, status, status_deleted) VALUES
('John Doe', 'john@example.com', '$2a$10$X7UrH5UxX5UxX5UxX5UxX.5UxX5UxX5UxX5UxX5UxX5UxX5UxX5Ux', 2, '08123456789', 'Sales Representative', 1, 0),
('Jane Smith', 'jane@example.com', '$2a$10$X7UrH5UxX5UxX5UxX5UxX.5UxX5UxX5UxX5UxX5UxX5UxX5UxX5Ux', 2, '08123456790', 'Sales Manager', 1, 0),
('Bob Johnson', 'bob@example.com', '$2a$10$X7UrH5UxX5UxX5UxX5UxX.5UxX5UxX5UxX5UxX5UxX5UxX5UxX5Ux', 2, '08123456791', 'Sales Executive', 1, 0),
('Alice Brown', 'alice@example.com', '$2a$10$X7UrH5UxX5UxX5UxX5UxX.5UxX5UxX5UxX5UxX5UxX5UxX5UxX5Ux', 2, '08123456792', 'Sales Coordinator', 1, 0),
('Charlie Wilson', 'charlie@example.com', '$2a$10$X7UrH5UxX5UxX5UxX5UxX.5UxX5UxX5UxX5UxX5UxX5UxX5UxX5Ux', 2, '08123456793', 'Sales Director', 1, 0);

-- Insert sample events
INSERT INTO events (nama_event, jadwal, location, deskripsi, peserta, created_by, status, status_deleted) VALUES
('Meeting Sales Team', '2024-01-15 10:00:00', 'https://meet.google.com/abc-defg-hij', 'Meeting rutin tim sales untuk membahas target bulanan dan strategi penjualan', '["2","3","4","5"]', 1, 'active', 0),
('Training Product Knowledge', '2024-01-20 14:00:00', 'Ruang Meeting Lt. 2', 'Training pengetahuan produk untuk tim sales baru', '["2","3","4","5","8"]', 1, 'active', 0),
('Client Presentation', '2024-01-10 09:00:00', 'https://zoom.us/j/123456789', 'Presentasi produk kepada client potensial', '["2","3"]', 1, 'completed', 0),
('Monthly Review', '2024-01-25 16:00:00', 'Ruang Conference', 'Review performa bulanan tim sales', '["2","3","4","5"]', 1, 'active', 0),
('Workshop Sales Technique', '2024-01-05 13:00:00', 'Auditorium', 'Workshop teknik penjualan untuk meningkatkan skill tim', '["2","3","4","5","8"]', 1, 'completed', 0); 