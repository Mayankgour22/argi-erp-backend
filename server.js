require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const productRoutes = require('./routes/productRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const dealerRoutes = require('./routes/dealerRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // support file uploads if base64 images are sent

// API Route Registrations
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/dealers', dealerRoutes);
app.use('/api/reports', reportRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Agriculture ERP API Server' });
});

const MONGODB_URI = process.env.MONGODB_URI;

console.log("MONGODB_URI =", process.env.MONGODB_URI);


mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB Connected successfully!');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      console.log(`Backend server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });
