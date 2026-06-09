const mongoose = require('mongoose');

const StockLogSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchNumber: { type: String, required: true },
  type: { type: String, enum: ['IN', 'OUT'], required: true },
  quantity: { type: Number, required: true },
  source: { type: String, enum: ['PURCHASE', 'SALE', 'ADJUSTMENT'], required: true },
  referenceId: { type: String }, // purchaseId or invoiceId
  details: { type: String },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('StockLog', StockLogSchema);
