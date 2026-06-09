const mongoose = require('mongoose');

const LedgerTransactionSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  type: { type: String, enum: ['SALE', 'PAYMENT', 'RETURN'], required: true },
  amount: { type: Number, required: true }, // positive for sales, negative for payments/returns
  referenceId: { type: String }, // Invoice ID or Payment Receipt ID
  description: { type: String }
});

const DealerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  gstNumber: { type: String },
  address: { type: String },
  outstandingBalance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 100000 }, // default credit limit in Rupees
  ledger: [LedgerTransactionSchema]
}, { timestamps: true });

module.exports = mongoose.model('Dealer', DealerSchema);
