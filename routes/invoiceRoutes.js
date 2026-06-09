const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Dealer = require('../models/Dealer');
const StockLog = require('../models/StockLog');
const { verifyToken, authorize } = require('../middleware/auth');

// GET /api/invoices - Get sale invoices list
router.get('/', verifyToken, async (req, res) => {
  try {
    const invoices = await Invoice.find({})
      .populate('dealer', 'name mobile gstNumber')
      .populate('items.product', 'name sku')
      .sort({ date: -1 });
    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/invoices/:id - Get detailed invoice by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('dealer', 'name mobile gstNumber address')
      .populate('items.product', 'name sku company')
      .populate({
        path: 'items.product',
        populate: { path: 'company', select: 'name' }
      });
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/invoices - Create dealer invoice (POS Billing)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { dealer, items, subtotal, gstTotal, discountTotal, grandTotal, paymentReceived, date } = req.body;

    if (!dealer || !items || !items.length) {
      return res.status(400).json({ message: 'Dealer and billing items are required' });
    }

    // 1. Check stock availability for all items before initiating transactions
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product not found` });
      }

      const batch = product.batches.find(b => b.batchNumber === item.batchNumber);
      if (!batch) {
        return res.status(400).json({ message: `Batch ${item.batchNumber} not found for product ${product.name}` });
      }

      if (batch.quantity < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock in batch ${item.batchNumber} for product ${product.name}. Available: ${batch.quantity}, Requested: ${item.quantity}` 
        });
      }
    }

    // Generate Invoice Number (Example: AGRI/2026/0001)
    const count = await Invoice.countDocuments();
    const invoiceNumber = `AGRI/${new Date().getFullYear()}/${(count + 1).toString().padStart(4, '0')}`;

    // 2. Save Invoice
    const status = paymentReceived >= grandTotal ? 'PAID' : (paymentReceived > 0 ? 'PARTIALLY_PAID' : 'UNPAID');
    const invoice = new Invoice({
      invoiceNumber,
      dealer,
      items,
      subtotal,
      gstTotal,
      discountTotal: discountTotal || 0,
      grandTotal,
      paymentReceived: paymentReceived || 0,
      status,
      date: date || new Date()
    });

    await invoice.save();

    // 3. Deduct stock from specific batches & create stock logs
    for (const item of items) {
      const product = await Product.findById(item.product);
      const batch = product.batches.find(b => b.batchNumber === item.batchNumber);
      
      batch.quantity -= item.quantity;
      await product.save();

      // Write to Stock Log (OUT)
      const stockLog = new StockLog({
        product: item.product,
        batchNumber: item.batchNumber,
        type: 'OUT',
        quantity: item.quantity,
        source: 'SALE',
        referenceId: invoice._id.toString(),
        details: `Sold to dealer (Inv: ${invoiceNumber})`
      });
      await stockLog.save();
    }

    // 4. Update Dealer outstanding balance & ledger
    const dealerDoc = await Dealer.findById(dealer);
    if (dealerDoc) {
      const remainingUnpaidAmount = grandTotal - (paymentReceived || 0);
      dealerDoc.outstandingBalance += remainingUnpaidAmount;
      
      // Add transaction to Dealer ledger
      dealerDoc.ledger.push({
        date: date || new Date(),
        type: 'SALE',
        amount: grandTotal,
        referenceId: invoice._id.toString(),
        description: `Sales Invoice: ${invoiceNumber}`
      });

      if (paymentReceived > 0) {
        dealerDoc.ledger.push({
          date: date || new Date(),
          type: 'PAYMENT',
          amount: -paymentReceived,
          referenceId: invoice._id.toString(),
          description: `Payment received against Invoice: ${invoiceNumber}`
        });
      }

      await dealerDoc.save();
    }

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
