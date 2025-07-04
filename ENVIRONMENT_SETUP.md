# Environment Variables Setup

## Cara Setup Environment Variables

### 1. Copy File Example
```bash
# Copy file env.example menjadi .env
cp env.example .env
```

### 2. Edit File .env
Edit file `.env` dan sesuaikan nilai-nilainya dengan environment Anda:

```env
# Server Configuration
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_database_password
DB_NAME=sistem_mki

# JWT Configuration
JWT_SECRET=your_very_strong_secret_key_here

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=upload

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info

# Production Settings
NODE_ENV=development

# Security Settings
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. Environment Variables yang Wajib

#### Database Configuration
- `DB_HOST`: Host database MySQL (default: localhost)
- `DB_USER`: Username database MySQL (default: root)
- `DB_PASSWORD`: Password database MySQL
- `DB_NAME`: Nama database MySQL (default: sistem_mki)

#### JWT Configuration
- `JWT_SECRET`: Secret key untuk JWT token (wajib diubah untuk production)

#### Server Configuration
- `PORT`: Port untuk menjalankan server (default: 3000)

### 4. Environment Variables Opsional

#### File Upload Configuration
- `MAX_FILE_SIZE`: Maksimal ukuran file upload dalam bytes (default: 10MB)
- `UPLOAD_DIR`: Direktori untuk menyimpan file upload (default: upload)

#### CORS Configuration
- `CORS_ORIGIN`: Origin yang diizinkan untuk CORS

#### Logging Configuration
- `LOG_LEVEL`: Level logging (debug, info, warn, error)

#### Security Settings
- `RATE_LIMIT_WINDOW_MS`: Window time untuk rate limiting
- `RATE_LIMIT_MAX_REQUESTS`: Maksimal request per IP per window

### 5. Contoh Setup untuk Development

```env
# Development Environment
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=sistem_mki
JWT_SECRET=dev_secret_key_2024
NODE_ENV=development
LOG_LEVEL=debug
```

### 6. Contoh Setup untuk Production

```env
# Production Environment
PORT=3000
DB_HOST=your_production_db_host
DB_USER=your_production_db_user
DB_PASSWORD=your_strong_production_password
DB_NAME=sistem_mki_production
JWT_SECRET=your_very_strong_production_secret_key_min_32_chars
NODE_ENV=production
LOG_LEVEL=error
CORS_ORIGIN=https://yourdomain.com
```

### 7. Keamanan

⚠️ **PENTING:**
- Jangan pernah commit file `.env` ke repository
- Selalu gunakan JWT_SECRET yang kuat di production (minimal 32 karakter)
- Gunakan password database yang kuat
- Untuk production, gunakan database yang terpisah
- Pastikan CORS_ORIGIN sesuai dengan domain frontend

### 8. Troubleshooting

#### Database Connection Error
- Pastikan MySQL server berjalan
- Periksa DB_HOST, DB_USER, DB_PASSWORD, dan DB_NAME
- Pastikan database `sistem_mki` sudah dibuat

#### JWT Error
- Pastikan JWT_SECRET sudah diset
- JWT_SECRET minimal 32 karakter untuk keamanan

#### Port Already in Use
- Ganti PORT di file .env
- Atau matikan aplikasi yang menggunakan port tersebut

### 9. Verifikasi Setup

Setelah setup, jalankan server:
```bash
npm start
```

Server akan menampilkan environment variables yang digunakan:
```
Server berjalan di port 3000
Backend Mobile MKI sudah berjalan dengan baik!
Environment variables:
- DB_HOST: localhost
- DB_USER: root
- DB_NAME: sistem_mki
- JWT_SECRET: Set
``` 