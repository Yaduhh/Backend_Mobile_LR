-- Insert data syarat ketentuan
INSERT INTO syarat_ketentuan (syarat, status_deleted, created_at, updated_at) VALUES
('Pembayaran dilakukan 50% saat PO dan 50% saat pengiriman', 0, NOW(), NOW()),
('Pengiriman dilakukan dalam waktu 7-14 hari kerja', 0, NOW(), NOW()),
('Garansi produk 1 tahun dari tanggal pengiriman', 0, NOW(), NOW()),
('Harga sudah termasuk PPN 11%', 0, NOW(), NOW()),
('Pembayaran dilakukan melalui transfer bank', 0, NOW(), NOW()),
('Barang yang sudah dipesan tidak dapat dikembalikan', 0, NOW(), NOW()),
('Klaim garansi harus disertai bukti pembelian', 0, NOW(), NOW()),
('Harga dapat berubah sewaktu-waktu tanpa pemberitahuan', 0, NOW(), NOW()); 