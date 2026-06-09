const express = require('express');
const router = express.Router();
const Dealer = require('../models/Dealer');
const { verifyToken, authorize } = require('../middleware/auth');

// GET /api/dealers - List all dealers
router.get('/', verifyToken, async (req, res) => {
  try {
    const dealers = await Dealer.find({}).sort({ name: 1 });
    res.json(dealers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/dealers/:id - Get single dealer details & ledger
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }
    res.json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/dealers - Register a new dealer
router.post('/', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, mobile, gstNumber, address, creditLimit } = req.body;
    if (!name || !mobile) {
      return res.status(400).json({ message: 'Dealer Name and Mobile Number are required' });
    }

    const dealer = new Dealer({
      name,
      mobile,
      gstNumber,
      address,
      creditLimit: creditLimit || 100000,
      outstandingBalance: 0,
      ledger: []
    });

    await dealer.save();
    res.status(201).json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/dealers/:id - Update dealer profile
router.put('/:id', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, mobile, gstNumber, address, creditLimit } = req.body;
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }

    dealer.name = name || dealer.name;
    dealer.mobile = mobile || dealer.mobile;
    dealer.gstNumber = gstNumber || dealer.gstNumber;
    dealer.address = address || dealer.address;
    dealer.creditLimit = creditLimit !== undefined ? creditLimit : dealer.creditLimit;

    await dealer.save();
    res.json(dealer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/dealers/:id/payments - Record a payment from a dealer (reduces balance)
router.post('/:id/payments', verifyToken, async (req, res) => {
  try {
    const { amount, description, date } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Amount must be positive' });
    }

    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }

    // Deduct from outstanding balance
    dealer.outstandingBalance -= amount;

    // Add ledger entry
    const receiptId = `REC/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;
    dealer.ledger.push({
      date: date || new Date(),
      type: 'PAYMENT',
      amount: -amount,
      referenceId: receiptId,
      description: description || 'Direct payment receipt'
    });

    await dealer.save();
    res.status(201).json({ message: 'Payment recorded successfully', dealer });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/dealers/:id - Delete a dealer profile
router.delete('/:id', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const dealer = await Dealer.findById(req.params.id);
    if (!dealer) {
      return res.status(404).json({ message: 'Dealer not found' });
    }
    await Dealer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Dealer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
