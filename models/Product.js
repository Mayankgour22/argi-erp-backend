const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  batchNumber: { type: String, required: true },
  expiryDate: { type: Date, required: true },
  quantity: { type: Number, required: true, default: 0 }
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  image: { type: String }, // base64 or URL
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  category: { 
    type: String, 
    enum: ['Pesticide', 'Fungicide', 'Fertilizer', 'Herbicide', 'Growth Promoter', 'Seeds', 'Other'], 
    default: 'Other' 
  },
  purchasePrice: { type: Number, required: true }, // rate we buy from manufacturer
  sellingPrice: { type: Number, required: true },  // rate we sell to dealer
  gstPercentage: { type: Number, required: true, default: 18 }, // GST rate (e.g. 5, 12, 18)
  batches: [BatchSchema],
  minStockLevel: { type: Number, required: true, default: 10 }
}, { timestamps: true });

// Getter/Virtual for total stock across all batches
ProductSchema.virtual('currentStock').get(function() {
  if (!this.batches) return 0;
  return this.batches.reduce((sum, batch) => sum + batch.quantity, 0);
});

// Ensure virtuals are serialized
ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Product', ProductSchema);
