const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const StockLog = require('../models/StockLog');
const { verifyToken, authorize } = require('../middleware/auth');

// GET /api/purchases - Get purchase history
router.get('/', verifyToken, async (req, res) => {
  try {
    const purchases = await Purchase.find({})
      .populate('company', 'name gstNumber')
      .populate('items.product', 'name sku')
      .sort({ date: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/purchases - Add new stock procurement (Stock In)
router.post('/', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { company, invoiceNumber, items, subtotal, gstTotal, grandTotal, date } = req.body;

    if (!company || !invoiceNumber || !items || !items.length) {
      return res.status(400).json({ message: 'Manufacturer, invoice number, and items are required' });
    }

    // 1. Create and save Purchase entry
    const purchase = new Purchase({
      company,
      invoiceNumber,
      items,
      subtotal,
      gstTotal,
      grandTotal,
      date: date || new Date()
    });

    await purchase.save();

    // 2. Loop through products and update their stock batches & create stock log
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) continue;

      // Check if batch already exists in this product
      const existingBatch = product.batches.find(b => b.batchNumber === item.batchNumber);
      
      if (existingBatch) {
        // Update existing batch quantity
        existingBatch.quantity += item.quantity;
      } else {
        // Add new batch details
        product.batches.push({
          batchNumber: item.batchNumber,
          expiryDate: new Date(item.expiryDate),
          quantity: item.quantity
        });
      }

      await product.save();

      // Write to Stock Movement History log
      const stockLog = new StockLog({
        product: item.product,
        batchNumber: item.batchNumber,
        type: 'IN',
        quantity: item.quantity,
        source: 'PURCHASE',
        referenceId: purchase._id.toString(),
        details: `Procured stock from Manufacturer (Inv: ${invoiceNumber})`
      });

      await stockLog.save();
    }

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
