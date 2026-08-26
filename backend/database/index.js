const dns = require('dns');
const mongoose = require('mongoose');

// Configure DNS for mongodb+srv resolution on networks where ISP/local DNS drops SRV records
try {
    if (typeof dns.setDefaultResultOrder === 'function') {
        dns.setDefaultResultOrder('ipv4first');
    }
    // Set fallback public DNS servers if needed
    dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
    // Ignore if not permitted
}

// Set strictQuery before connection
mongoose.set('strictQuery', false);

const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI || 'mongodb://localhost:27017/soccer';
const isProd = process.env.NODE_ENV === 'production';

const MONGODB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
};

console.log(`🔌 Connecting to MongoDB (${isProd ? 'Production' : 'Development'})...`);

let isConnected = false;

// Connect to MongoDB with caching for serverless environments
if (mongoose.connection.readyState === 0) {
    mongoose.connect(mongoUrl, MONGODB_OPTIONS)
        .then(() => {
            isConnected = true;
            console.log("✅ Successful connection with MongoDB");
        })
        .catch((err) => {
            console.error('❌ Error: Connection to MongoDB not successful:', err.message);
            // In serverless (Vercel), don't exit process so other requests can retry
            if (!process.env.VERCEL) {
                // local warning only
            }
        });
}

mongoose.Promise = global.Promise;

module.exports = mongoose;
