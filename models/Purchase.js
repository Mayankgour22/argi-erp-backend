const mongoose = require('mongoose');

const PurchaseItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true },
  gstPercentage: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  total: { type: Number, required: true }
});

const PurchaseSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  invoiceNumber: { type: String, required: true },
  items: [PurchaseItemSchema],
  subtotal: { type: Number, required: true },
  gstTotal: { type: Number, required: true },
  grandTotal: { type: Number, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Purchase', PurchaseSchema);
