const dns = require('dns');
const mongoose = require('mongoose');

// Configure DNS for mongodb+srv resolution ONLY on local networks where ISP drops SRV records.
// NEVER run dns.setServers in Vercel / AWS Lambda as it overrides AWS VPC DNS and blocks connections.
if (!process.env.VERCEL && !process.env.AWS_REGION) {
    try {
        if (typeof dns.setDefaultResultOrder === 'function') {
            dns.setDefaultResultOrder('ipv4first');
        }
        dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
    } catch (e) {
        // Ignore if not permitted
    }
}

// Set strictQuery before connection
mongoose.set('strictQuery', false);

const mongoUrl = process.env.MONGODB_URL || process.env.MONGODB_URI || (process.env.VERCEL ? '' : 'mongodb://localhost:27017/soccer');
const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

const MONGODB_OPTIONS = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: process.env.VERCEL ? 5000 : 10000,
    socketTimeoutMS: 45000,
};

let cachedPromise = null;

async function connectToDatabase() {
    if (!mongoUrl) {
        throw new Error('MONGODB_URL is not defined in environment variables');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose;
    }

    if (mongoose.connection.readyState === 2 && cachedPromise) {
        await cachedPromise;
        return mongoose;
    }

    console.log(`🔌 Connecting to MongoDB (${isProd ? 'Production' : 'Development'})...`);
    cachedPromise = mongoose.connect(mongoUrl, MONGODB_OPTIONS)
        .then(() => {
            console.log("✅ Successful connection with MongoDB");
            return mongoose;
        })
        .catch((err) => {
            cachedPromise = null;
            console.error('❌ Error: Connection to MongoDB not successful:', err.message);
            throw err;
        });

    await cachedPromise;
    return mongoose;
}

// Auto-connect on startup for non-serverless or eager init
if (mongoUrl) {
    connectToDatabase().catch(() => {});
}

mongoose.Promise = global.Promise;
mongoose.connectToDatabase = connectToDatabase;

module.exports = mongoose;
