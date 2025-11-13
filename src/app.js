const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const dailyActivityRoutes = require('./routes/dailyActivityRoutes');
const absensiRoutes = require('./routes/absensiRoutes');
const eventRoutes = require('./routes/eventRoutes');
const arsipFileRoutes = require('./routes/arsipFileRoutes');
const adminClientRoutes = require('./routes/adminClientRoutes');
const adminArsipFileRoutes = require('./routes/adminArsipFileRoutes');
const penawaranRoutes = require('./routes/penawaranRoutes');
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes');
const gudangPurchaseOrderRoutes = require('./routes/gudangPurchaseOrderRoutes');
const suratJalanRoutes = require('./routes/suratJalanRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve dokumentasi images statically
app.use('/upload/dokumentasi', express.static(require('path').join(process.cwd(), 'upload/dokumentasi/')));
// Serve arsip files statically
app.use('/upload/arsip_files', express.static(require('path').join(process.cwd(), 'upload/arsip_files/')));
// Serve profile images statically
app.use('/upload/profiles', express.static(require('path').join(process.cwd(), 'upload/profiles/')));
// Serve kop surat logos statically
app.use('/upload/kop-surat-logos', express.static(require('path').join(process.cwd(), 'upload/kop-surat-logos/')));
// Serve tanda tangan statically
app.use('/upload/tanda-tangan', express.static(require('path').join(process.cwd(), 'upload/tanda-tangan/')));

// Routes
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Backend Mobile MKI sudah berjalan!'
  });
});

// Debug route untuk list files
app.get('/debug/files/:folder', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const folder = req.params.folder;
  const folderPath = path.join(process.cwd(), 'upload', folder);
  
  console.log('📁 Listing files in:', folderPath);
  
  if (!fs.existsSync(folderPath)) {
    return res.json({ 
      success: false, 
      message: 'Folder not found',
      path: folderPath 
    });
  }
  
  const files = fs.readdirSync(folderPath);
  res.json({ 
    success: true, 
    folder: folderPath,
    files: files,
    count: files.length
  });
});
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/daily-activities', dailyActivityRoutes);
app.use('/api/absensi', absensiRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/arsip-files', arsipFileRoutes);
app.use('/api/admin/clients', adminClientRoutes);
app.use('/api/admin/events', eventRoutes);
app.use('/api/admin/arsip-files', adminArsipFileRoutes);
app.use('/api/penawaran', penawaranRoutes);
app.use('/api/purchase-order', purchaseOrderRoutes);
app.use('/api/gudang/purchase-orders', gudangPurchaseOrderRoutes);
app.use('/api/surat-jalan', suratJalanRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Terjadi kesalahan pada server'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route tidak ditemukan'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  const fs = require('fs');
  const path = require('path');
  
  console.log(`Server berjalan di port ${PORT}`);
  console.log('Backend Mobile MKI sudah berjalan dengan baik!');
  console.log('Environment variables:');
  console.log('- DB_HOST:', process.env.DB_HOST || 'localhost (default)');
  console.log('- DB_USER:', process.env.DB_USER || 'root (default)');
  console.log('- DB_NAME:', process.env.DB_NAME || 'sistem_mki (default)');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'mki_secret_key_2024 (default)');
  
  console.log('\n📁 Upload Folders:');
  const uploadPath = path.join(process.cwd(), 'upload');
  console.log('- Base path:', uploadPath);
  
  const folders = ['kop-surat-logos', 'tanda-tangan', 'dokumentasi', 'arsip_files', 'profiles'];
  folders.forEach(folder => {
    const folderPath = path.join(uploadPath, folder);
    const exists = fs.existsSync(folderPath);
    const count = exists ? fs.readdirSync(folderPath).length : 0;
    console.log(`- ${folder}: ${exists ? '✅ Exists' : '❌ Not found'} (${count} files)`);
  });
  
  console.log('\n🌐 Static URLs:');
  console.log(`- http://localhost:${PORT}/upload/kop-surat-logos/[filename]`);
  console.log(`- http://localhost:${PORT}/upload/tanda-tangan/[filename]`);
});