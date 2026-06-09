const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Company = require('../models/Company');
const Dealer = require('../models/Dealer');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const StockLog = require('../models/StockLog');
const { verifyToken } = require('../middleware/auth');

// GET /api/reports/dashboard - Dashboard KPI aggregates
router.get('/dashboard', verifyToken, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const totalCompanies = await Company.countDocuments();
    const totalDealers = await Dealer.countDocuments();

    // 1. Total Stock Value = sum(batch.qty * product.purchasePrice)
    const products = await Product.find({});
    let totalStockValValuation = 0;
    let lowStockCount = 0;

    products.forEach(p => {
      const stock = p.currentStock;
      totalStockValValuation += stock * p.purchasePrice;
      if (stock <= p.minStockLevel) {
        lowStockCount++;
      }
    });

    // 2. Sales figures
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const todaySalesData = await Invoice.aggregate([
      { $match: { date: { $gte: startOfToday } } },
      { $group: { _id: null, totalSales: { $sum: '$grandTotal' } } }
    ]);
    const todaySales = todaySalesData.length > 0 ? todaySalesData[0].totalSales : 0;

    const monthlySalesData = await Invoice.aggregate([
      { $match: { date: { $gte: startOfMonth } } },
      { $group: { _id: null, totalSales: { $sum: '$grandTotal' } } }
    ]);
    const monthlySales = monthlySalesData.length > 0 ? monthlySalesData[0].totalSales : 0;

    // 3. Recent Transactions (mix of sales and purchases)
    const recentInvoices = await Invoice.find({})
      .populate('dealer', 'name')
      .sort({ date: -1 })
      .limit(5);

    const recentPurchases = await Purchase.find({})
      .populate('company', 'name')
      .sort({ date: -1 })
      .limit(5);

    // Merge & Sort recent transactions
    const recentTransactions = [
      ...recentInvoices.map(inv => ({
        id: inv._id,
        invoiceNumber: inv.invoiceNumber,
        type: 'SALE',
        entity: inv.dealer ? inv.dealer.name : 'Unknown Dealer',
        amount: inv.grandTotal,
        date: inv.date
      })),
      ...recentPurchases.map(pur => ({
        id: pur._id,
        invoiceNumber: pur.invoiceNumber,
        type: 'PURCHASE',
        entity: pur.company ? pur.company.name : 'Unknown Supplier',
        amount: pur.grandTotal,
        date: pur.date
      }))
    ].sort((a, b) => b.date - a.date).slice(0, 8);

    // 4. Sales & Purchase Chart Data (Last 6 Months)
    const chartData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const year = d.getFullYear();
      const month = d.getMonth();

      const mStart = new Date(year, month, 1);
      const mEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const mSales = await Invoice.aggregate([
        { $match: { date: { $gte: mStart, $lte: mEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);

      const mPurchases = await Purchase.aggregate([
        { $match: { date: { $gte: mStart, $lte: mEnd } } },
        { $group: { _id: null, total: { $sum: '$grandTotal' } } }
      ]);

      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      chartData.push({
        month: `${monthNames[month]} ${year}`,
        sales: mSales.length > 0 ? mSales[0].total : 0,
        purchases: mPurchases.length > 0 ? mPurchases[0].total : 0
      });
    }

    // 5. Expiry count
    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    let expiryAlertsCount = 0;
    products.forEach(p => {
      p.batches.forEach(b => {
        if (b.expiryDate <= ninetyDays && b.quantity > 0) {
          expiryAlertsCount++;
        }
      });
    });

    res.json({
      totalProducts,
      totalCompanies,
      totalDealers,
      totalStockValue: totalStockValValuation,
      todaySales,
      monthlySales,
      lowStockAlerts: lowStockCount,
      expiryAlerts: expiryAlertsCount,
      recentTransactions,
      chartData
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/reports/sales - Complete Sales Report
router.get('/sales', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const invoices = await Invoice.find(query)
      .populate('dealer', 'name gstNumber')
      .populate('items.product', 'name sku')
      .sort({ date: -1 });

    const aggregates = invoices.reduce((acc, inv) => {
      acc.subtotal += inv.subtotal;
      acc.gstTotal += inv.gstTotal;
      acc.discountTotal += inv.discountTotal;
      acc.grandTotal += inv.grandTotal;
      return acc;
    }, { subtotal: 0, gstTotal: 0, discountTotal: 0, grandTotal: 0 });

    res.json({ invoices, aggregates });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/reports/purchases - Complete Purchase Report
router.get('/purchases', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const purchases = await Purchase.find(query)
      .populate('company', 'name gstNumber')
      .populate('items.product', 'name sku')
      .sort({ date: -1 });

    const aggregates = purchases.reduce((acc, pur) => {
      acc.subtotal += pur.subtotal;
      acc.gstTotal += pur.gstTotal;
      acc.grandTotal += pur.grandTotal;
      return acc;
    }, { subtotal: 0, gstTotal: 0, grandTotal: 0 });

    res.json({ purchases, aggregates });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/reports/profit - Profit & Margin Report
router.get('/profit', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const invoices = await Invoice.find(query)
      .populate('items.product', 'purchasePrice sellingPrice name sku')
      .sort({ date: -1 });

    let totalRevenue = 0;
    let totalCost = 0;
    let details = [];

    invoices.forEach(inv => {
      let invRevenue = inv.grandTotal; // using total values
      let invCost = 0;

      inv.items.forEach(item => {
        // Calculate item-wise cost
        const purchaseRate = item.product ? item.product.purchasePrice : item.rate * 0.8; // default fallback cost
        const itemCost = purchaseRate * item.quantity;
        invCost += itemCost;

        details.push({
          date: inv.date,
          invoiceNumber: inv.invoiceNumber,
          productName: item.product ? item.product.name : 'Unknown Product',
          sku: item.product ? item.product.sku : 'N/A',
          quantity: item.quantity,
          sellingRate: item.rate,
          purchaseRate: purchaseRate,
          gstPercentage: item.gstPercentage,
          saleTotal: item.total,
          costTotal: itemCost,
          profit: item.total - itemCost
        });
      });

      totalRevenue += invRevenue;
      totalCost += invCost;
    });

    const totalProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    res.json({
      summary: {
        totalRevenue,
        totalCost,
        totalProfit,
        marginPercentage
      },
      details
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/reports/gst - GST Summary (Input vs Output tax)
router.get('/gst', verifyToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Output GST (Tax collected from dealer sales)
    const salesGST = await Invoice.aggregate([
      { $match: query },
      { $group: { _id: null, totalGST: { $sum: '$gstTotal' } } }
    ]);
    const outputGST = salesGST.length > 0 ? salesGST[0].totalGST : 0;

    // Input GST (Tax paid on manufacturer purchases)
    const purchaseGST = await Purchase.aggregate([
      { $match: query },
      { $group: { _id: null, totalGST: { $sum: '$gstTotal' } } }
    ]);
    const inputGST = purchaseGST.length > 0 ? purchaseGST[0].totalGST : 0;

    res.json({
      outputGST, // tax collected
      inputGST,  // tax paid
      netGSTPayable: Math.max(0, outputGST - inputGST) // net tax payable
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET /api/reports/stock-movement - List stock movement logs
router.get('/stock-movement', verifyToken, async (req, res) => {
  try {
    const { productId } = req.query;
    let query = {};
    if (productId) {
      query.product = productId;
    }

    const logs = await StockLog.find(query)
      .populate('product', 'name sku')
      .sort({ date: -1 });

    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
