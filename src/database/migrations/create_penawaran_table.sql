CREATE TABLE IF NOT EXISTS `penawaran` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_user` bigint(20) UNSIGNED NOT NULL,
  `id_client` bigint(20) UNSIGNED NOT NULL,
  `id_gudang` bigint(20) UNSIGNED DEFAULT NULL,
  `kop_surat_id` bigint(20) UNSIGNED DEFAULT NULL,
  `project` varchar(255) DEFAULT NULL,
  `nomor_penawaran` varchar(255) NOT NULL,
  `tanggal_penawaran` date DEFAULT NULL,
  `judul_penawaran` varchar(255) NOT NULL,
  `diskon` decimal(8,2) DEFAULT 0.00,
  `diskon_satu` int(11) DEFAULT 0,
  `diskon_dua` int(11) DEFAULT 0,
  `ppn` int(11) DEFAULT 11,
  `total` decimal(15,2) DEFAULT 0.00,
  `total_diskon` decimal(15,2) DEFAULT 0.00,
  `total_diskon_1` decimal(15,2) DEFAULT 0.00,
  `total_diskon_2` decimal(15,2) DEFAULT 0.00,
  `grand_total` decimal(15,2) DEFAULT 0.00,
  `json_produk` json DEFAULT NULL,
  `syarat_kondisi` json DEFAULT NULL,
  `catatan` text DEFAULT NULL,
  `status` tinyint(1) DEFAULT 0 COMMENT '0=Draft, 1=WIN, 2=LOSE',
  `status_deleted` tinyint(1) DEFAULT 0,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `penawaran_id_user_foreign` (`id_user`),
  KEY `penawaran_id_client_foreign` (`id_client`),
  KEY `penawaran_id_gudang_foreign` (`id_gudang`),
  KEY `penawaran_kop_surat_id_foreign` (`kop_surat_id`),
  KEY `penawaran_created_by_foreign` (`created_by`),
  KEY `penawaran_status_deleted_index` (`status_deleted`),
  KEY `penawaran_status_index` (`status`),
  KEY `penawaran_tanggal_penawaran_index` (`tanggal_penawaran`),
  KEY `penawaran_created_at_index` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add foreign key constraints
ALTER TABLE `penawaran`
  ADD CONSTRAINT `penawaran_id_user_foreign` FOREIGN KEY (`id_user`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `penawaran_id_client_foreign` FOREIGN KEY (`id_client`) REFERENCES `clients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `penawaran_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

-- Add sample data (optional)
INSERT INTO `penawaran` (`id_user`, `id_client`, `id_gudang`, `kop_surat_id`, `project`, `nomor_penawaran`, `tanggal_penawaran`, `judul_penawaran`, `diskon`, `diskon_satu`, `diskon_dua`, `ppn`, `total`, `total_diskon`, `total_diskon_1`, `total_diskon_2`, `grand_total`, `json_produk`, `syarat_kondisi`, `catatan`, `status`, `status_deleted`, `created_by`) VALUES
(1, 1, 1, 1, 'Project Sample 1', '001/I/SP-LRL/25', '2025-01-15', 'Penawaran Pipa PVC Standard', 5.00, 2, 1, 11, 10000000.00, 500000.00, 190000.00, 93100.00, 10000000.00, '[]', '[]', 'Sample penawaran untuk testing', 0, 0, 1),
(1, 2, 1, 1, 'Project Sample 2', '002/I/SP-LRL/25', '2025-01-16', 'Penawaran Pipa PVC AW', 3.00, 1, 0, 11, 5000000.00, 150000.00, 48500.00, 0.00, 5000000.00, '[]', '[]', 'Sample penawaran kedua', 1, 0, 1); 