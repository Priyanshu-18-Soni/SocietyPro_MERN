const dns = require('dns');
const path = require('path');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const authRoutes = require('./routes/authRoutes');
const societyRoutes = require('./routes/societyRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const committeeRoutes = require('./routes/committeeRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const financeRoutes = require('./routes/financeRoutes');

const app = express();

// Security: Secure HTTP headers (XSS, clickjacking, MIME sniffing protection)
app.use(helmet());
app.use(cors());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

// Serve uploads statically (relax Cross-Origin-Resource-Policy for this route only)
app.use(
  '/uploads',
  (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next();
  },
  express.static(path.join(__dirname, 'uploads'))
);

// Auth routes
app.use('/api/auth', authRoutes);

// Society routes
app.use('/api/society', societyRoutes);

// User routes
app.use('/api/users', userRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Committee routes
app.use('/api/committee', committeeRoutes);

// Grievance Redressal (Complaints) routes
app.use('/api/complaints', complaintRoutes);

// Notice Board routes
app.use('/api/notices', noticeRoutes);

// Treasury & Finance Ledger routes
app.use('/api/finances', financeRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('SocietyPro backend is running');
});

// Catch-all 404 JSON handler for undefined routes
app.use((req, res) => res.status(404).json({ message: 'Resource not found' }));

// Global error-handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('RAZORPAY_KEY_ID present:', !!process.env.RAZORPAY_KEY_ID);
    console.log('RAZORPAY_KEY_SECRET present:', !!process.env.RAZORPAY_KEY_SECRET);
});