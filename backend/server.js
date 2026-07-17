const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const testRoutes = require('./routes/testRoutes');
const societyRoutes = require('./routes/societyRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Auth routes
app.use('/api/auth', authRoutes);

// Test routes
app.use('/api/test', testRoutes);

// Society routes
app.use('/api/society', societyRoutes);

// Test route
app.get('/', (req, res) => {
    res.send('SocietyPro backend is running');
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected'))
    .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});