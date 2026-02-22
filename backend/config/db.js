const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Prefer an explicit non-SRV URI when available to avoid DNS SRV lookup issues
    const uri = process.env.MONGO_URI_NON_SRV || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI (or MONGO_URI_NON_SRV) is not defined in .env');

    await mongoose.connect(uri, {
      // These options are no longer necessary in Mongoose 7+
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });

    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);

    // If the error indicates DNS SRV resolution failed, give guidance
    if (err && err.code === 'ENOTFOUND' && err.syscall === 'querySrv') {
      console.error('Hint: DNS SRV lookup failed. If using MongoDB Atlas, copy the STANDARD (non-SRV) connection string from Atlas and set MONGO_URI_NON_SRV in your .env; alternatively check DNS (try 8.8.8.8 / 1.1.1.1), or disable VPN/proxy.');
    }

    process.exit(1); // Stop server if DB fails
  }
};

module.exports = connectDB;