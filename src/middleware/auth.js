const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    console.log('=== AUTH DEBUG ===');
    console.log('Headers:', req.headers);
    
    // Ambil token dari header
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token tidak ditemukan');
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token:', token);

    // Verifikasi token without expiration check
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mki_secret_key_2024');
    console.log('Decoded token:', decoded);
    
    // Tambahkan user ke request
    req.user = decoded;
    console.log('✅ Auth berhasil, user:', req.user);
    console.log('==================');
    
    next();
  } catch (error) {
    console.log('❌ Auth error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak valid'
      });
    }
    // Remove TokenExpiredError check since tokens never expire
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server'
    });
  }
};

// Middleware untuk admin (role = 1)
const adminAuth = (req, res, next) => {
  try {
    console.log('=== ADMIN AUTH DEBUG ===');
    console.log('Headers:', req.headers);
    
    // Ambil token dari header
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Token tidak ditemukan');
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak ditemukan'
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token:', token);

    // Verifikasi token without expiration check
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mki_secret_key_2024');
    console.log('Decoded token:', decoded);
    
    // Cek apakah user adalah admin (role = 1)
    if (decoded.role !== 1) {
      console.log('❌ User bukan admin, role:', decoded.role);
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses admin'
      });
    }
    
    // Tambahkan user ke request
    req.user = decoded;
    console.log('✅ Admin auth berhasil, user:', req.user);
    console.log('==================');
    
    next();
  } catch (error) {
    console.log('❌ Admin auth error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token tidak valid'
      });
    }
    res.status(500).json({
      status: 'error',
      message: 'Terjadi kesalahan pada server'
    });
  }
};

// Middleware untuk mengecek role
const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Anda tidak memiliki akses'
      });
    }
    next();
  };
};

module.exports = { auth, adminAuth, checkRole }; 