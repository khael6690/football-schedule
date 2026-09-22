const path = require('path');
const dotenv = require('dotenv');

let configLoaded = false;
let config = null;

// Fungsi memuat konfigurasi environment
function loadEnvConfig() {
  if (configLoaded) return config;

  // Menentukan environment eksekusi
  const NODE_ENV = (process.env.NODE_ENV || 'development').trim();

  // Memuat file env yang sesuai
  const envFile = NODE_ENV === 'production' ? '.env.production' : '.env.development';
  const envPath = path.resolve(process.cwd(), envFile);

  // Memuat variabel environment
  const result = dotenv.config({ path: envPath });

  if (result.error) {
    console.warn(`⚠️ File ${envFile} tidak ditemukan, menggunakan konfigurasi .env default`);
    // Memuat .env default
    dotenv.config();
  }

  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📁 File env: ${envFile}`);

  // Konfigurasi default
  config = {
    // Environment
    NODE_ENV,
    isDev: NODE_ENV === 'development',
    isProd: NODE_ENV === 'production',
    isDevelopment: NODE_ENV === 'development',
    isProduction: NODE_ENV === 'production',

    // Server
    PORT: parseInt(process.env.PORT) || 3050,
    API_URL: process.env.API_URL || `http://localhost:${process.env.PORT || 3050}`,
    FRONTEND_URL: process.env.FRONTEND_URL || `http://localhost:${process.env.PORT || 3050}`,

    // Database
    MONGODB_URL: process.env.MONGODB_URL || 'mongodb://localhost:27017/soccer',

    // Rate Limiting
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || process.env.RATE_LIMIT_WINDOW_MS) || 60000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 500,
    PUBLIC_RATE_LIMIT_WINDOW: parseInt(process.env.PUBLIC_RATE_LIMIT_WINDOW || process.env.PUBLIC_RATE_LIMIT_WINDOW_MS) || 60000,
    PUBLIC_RATE_LIMIT_MAX: parseInt(process.env.PUBLIC_RATE_LIMIT_MAX) || 120,

    // CORS
    CORS_ORIGINS: process.env.CORS_ORIGINS || '*',

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'error' : 'debug'),

    // Swagger
    ENABLE_SWAGGER: process.env.ENABLE_SWAGGER === 'true' || NODE_ENV === 'development',

    // Fungsi untuk mendapatkan CORS origins
    getCorsOrigins: function() {
      const origins = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '*';
      if (origins === '*') return '*';
      return origins.split(',').map(o => o.trim());
    }
  };

  configLoaded = true;
  return config;
}

// Export function dan config object
module.exports = { loadEnvConfig, config: null };

// Getter untuk config memastikan konfigurasi sudah dimuat
Object.defineProperty(module.exports, 'config', {
  get: function() {
    if (!config) loadEnvConfig();
    return config;
  }
});
