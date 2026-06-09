const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { verifyToken, authorize } = require('../middleware/auth');

// GET /api/companies - Get list of manufacturers
router.get('/', verifyToken, async (req, res) => {
  try {
    const companies = await Company.find({}).sort({ name: 1 });
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/companies - Add chemical manufacturer
router.post('/', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, gstNumber, address, contactPerson, email, mobile } = req.body;
    if (!name || !gstNumber || !mobile) {
      return res.status(400).json({ message: 'Name, GST number and Mobile are required' });
    }

    const existing = await Company.findOne({ name });
    if (existing) {
      return res.status(400).json({ message: 'Manufacturer with this name already exists' });
    }

    const company = new Company({ name, gstNumber, address, contactPerson, email, mobile });
    await company.save();
    res.status(201).json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/companies/:id - Edit chemical manufacturer
router.put('/:id', verifyToken, authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, gstNumber, address, contactPerson, email, mobile } = req.body;
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Manufacturer not found' });
    }

    company.name = name || company.name;
    company.gstNumber = gstNumber || company.gstNumber;
    company.address = address || company.address;
    company.contactPerson = contactPerson || company.contactPerson;
    company.email = email || company.email;
    company.mobile = mobile || company.mobile;

    await company.save();
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE /api/companies/:id - Remove chemical manufacturer
router.delete('/:id', verifyToken, authorize(['admin']), async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Manufacturer not found' });
    }
    await Company.findByIdAndDelete(req.params.id);
    res.json({ message: 'Manufacturer deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
