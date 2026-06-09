const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  gstNumber: { type: String, required: true },
  address: { type: String },
  contactPerson: { type: String },
  email: { type: String },
  mobile: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);
