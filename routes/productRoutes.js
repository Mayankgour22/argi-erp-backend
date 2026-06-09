const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { verifyToken, authorize } = require('../middleware/auth');

// GET /api/products - Get all products (with optional search & category filter)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search, category, company } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      query.category = category;
    }
    if (company) {
      query.company = company;
    }

    const products = await Product.find(query).populate('company', 'name').sort({ name: 1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/products/low-stock - List products with low stock
router.get('/low-stock', verifyToken, async (req, res) => {
  try {
    const products = await Product.find({}).populate('company', 'name');
    const lowStock = products.filter(p => p.currentStock <= p.minStockLevel);
    res.json(lowStock);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/products/expiry-alerts - List products with batches expiring in 90 days
router.get('/expiry-alerts', verifyToken, async (req, res) => {
  try {
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    const today = new Date();

    const products = await Product.find({
      'batches.expiryDate': { $lte: ninetyDaysFromNow }
    }).populate('company', 'name');

    // Filter to isolate the specific batches that are expiring
    const alerts = [];
    products.forEach(product => {
      product.batches.forEach(batch => {
        if (batch.expiryDate <= ninetyDaysFromNow && batch.quantity > 0) {
          alerts.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
            company: product.company.name,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate,
            quantity: batch.quantity,
            isExpired: batch.expiryDate < today
          });
        }
      });
    });

    res.json(alerts.sort((a, b) => a.expiryDate - b.expiryDate));
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/products - Create a product
router.post('/', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, sku, company, category, purchasePrice, sellingPrice, gstPercentage, minStockLevel, image } = req.body;
    
    if (!name || !sku || !company || !purchasePrice || !sellingPrice) {
      return res.status(400).json({ message: 'Name, SKU, Company, Purchase Price and Selling Price are required' });
    }

    const existing = await Product.findOne({ sku });
    if (existing) {
      return res.status(400).json({ message: 'Product SKU already exists' });
    }

    const product = new Product({
      name,
      sku,
      company,
      category,
      purchasePrice,
      sellingPrice,
      gstPercentage,
      minStockLevel,
      image,
      batches: [] // initially empty stock
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/products/:id - Edit product details
router.put('/:id', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, sku, company, category, purchasePrice, sellingPrice, gstPercentage, minStockLevel, image } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.name = name || product.name;
    product.sku = sku || product.sku;
    product.company = company || product.company;
    product.category = category || product.category;
    product.purchasePrice = purchasePrice !== undefined ? purchasePrice : product.purchasePrice;
    product.sellingPrice = sellingPrice !== undefined ? sellingPrice : product.sellingPrice;
    product.gstPercentage = gstPercentage !== undefined ? gstPercentage : product.gstPercentage;
    product.minStockLevel = minStockLevel !== undefined ? minStockLevel : product.minStockLevel;
    product.image = image || product.image;

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/products/:id - Remove product
router.delete('/:id', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
