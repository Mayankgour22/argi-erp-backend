const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  batchNumber: { type: String, required: true },
  quantity: { type: Number, required: true },
  rate: { type: Number, required: true }, // selling price
  gstPercentage: { type: Number, required: true },
  gstAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 }, // discount on item
  total: { type: Number, required: true }
});

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, required: true, unique: true },
  dealer: { type: mongoose.Schema.Types.ObjectId, ref: 'Dealer', required: true },
  items: [InvoiceItemSchema],
  subtotal: { type: Number, required: true },
  gstTotal: { type: Number, required: true },
  discountTotal: { type: Number, default: 0 },
  grandTotal: { type: Number, required: true },
  paymentReceived: { type: Number, default: 0 },
  status: { type: String, enum: ['PAID', 'PARTIALLY_PAID', 'UNPAID'], default: 'UNPAID' },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Invoice', InvoiceSchema);
