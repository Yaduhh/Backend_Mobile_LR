# Laravel Compatibility Guide

## Overview
Aplikasi mobile ini telah dikonfigurasi untuk kompatibel dengan sistem autentikasi Laravel 12 Livewire default.

## Password Hashing
- **Algorithm**: bcrypt dengan salt rounds 12 (default Laravel 12)
- **Package**: bcryptjs (Node.js equivalent dari PHP bcrypt)
- **Compatibility**: 100% kompatibel dengan Laravel `Hash::make()` (salt rounds 12)

## Database Structure
Pastikan tabel `users` memiliki struktur yang sama dengan Laravel:

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role INT NOT NULL DEFAULT 2,
  notelp VARCHAR(20),
  profile TEXT,
  status TINYINT NOT NULL DEFAULT 1,
  status_deleted TINYINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Setup Instructions

### 1. Install Dependencies
```bash
cd Backend_Mobile_MKI
npm install
```

### 2. Create Admin User
```bash
node create_admin.js
```

### 3. Update Existing Admin Password (if needed)
```bash
node update_admin_password.js
```

## Admin Credentials
- **Email**: admin@mki.com
- **Password**: password
- **Role**: 1 (Admin)

## Password Rules (Simplified)
- Minimal 8 karakter
- Tidak ada ketentuan kompleks lainnya
- User-friendly dan mudah diingat

## Testing Compatibility

### 1. Test Mobile Registration
1. Register user baru di aplikasi mobile
2. Coba login di web Laravel dengan credentials yang sama
3. User seharusnya bisa login di kedua platform

### 2. Test Web Registration
1. Register user baru di web Laravel
2. Coba login di aplikasi mobile dengan credentials yang sama
3. User seharusnya bisa login di kedua platform

### 3. Test Password Change
1. Ubah password di aplikasi mobile
2. Coba login di web dengan password baru
3. Password seharusnya bekerja di kedua platform

## Troubleshooting

### Issue: "This password does not use the Bcrypt algorithm"
**Solution**: Pastikan menggunakan bcrypt dengan salt rounds 10:
```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

### Issue: Password tidak cocok antara mobile dan web
**Solution**: 
1. Pastikan menggunakan algoritma yang sama (bcrypt)
2. Pastikan salt rounds sama (10)
3. Restart backend setelah perubahan

### Issue: Admin tidak bisa login
**Solution**: Jalankan script update password:
```bash
node update_admin_password.js
```

## Notes
- Semua password di-hash menggunakan bcrypt dengan salt rounds 10
- Kompatibel dengan Laravel `Hash::make()` dan `Hash::check()`
- Timestamps (`created_at`, `updated_at`) terisi otomatis
- Validasi password menggunakan rules Laravel 12 Livewire 