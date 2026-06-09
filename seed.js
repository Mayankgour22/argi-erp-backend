require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
const Product = require('./models/Product');
const Dealer = require('./models/Dealer');
const Purchase = require('./models/Purchase');
const Invoice = require('./models/Invoice');
const StockLog = require('./models/StockLog');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agri_erp';

const seedDatabase = async () => {
  try {
    console.log('Connecting to database for seeding...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to database!');

    // Clear existing data
    console.log('Clearing existing collections...');
    await User.deleteMany({});
    await Company.deleteMany({});
    await Product.deleteMany({});
    await Dealer.deleteMany({});
    await Purchase.deleteMany({});
    await Invoice.deleteMany({});
    await StockLog.deleteMany({});

    // 1. Create Users
    console.log('Creating users...');
    const adminUser = new User({
      name: 'Super Admin',
      email: 'admin@agri.com',
      password: 'admin123', // Will be hashed via pre-save hook
      role: 'admin'
    });
    const managerUser = new User({
      name: 'Operations Manager',
      email: 'manager@agri.com',
      password: 'manager123',
      role: 'manager'
    });
    const staffUser = new User({
      name: 'Billing Executive',
      email: 'staff@agri.com',
      password: 'staff123',
      role: 'staff'
    });

    await adminUser.save();
    await managerUser.save();
    await staffUser.save();

    // 2. Create Chemical Companies (Manufacturers)
    console.log('Creating manufacturers...');
    const bayer = await Company.create({
      name: 'Bayer CropScience Ltd',
      gstNumber: '27AADCB1234F1Z1',
      address: 'Thane West, Maharashtra',
      contactPerson: 'Ramesh Sharma',
      email: 'contact@bayer.in',
      mobile: '9876543210'
    });

    const syngenta = await Company.create({
      name: 'Syngenta India Ltd',
      gstNumber: '27AACCB5678G2Z3',
      address: 'Pune, Maharashtra',
      contactPerson: 'Sanjay Deshmukh',
      email: 'info@syngenta.co.in',
      mobile: '9823456789'
    });

    const upl = await Company.create({
      name: 'UPL Limited',
      gstNumber: '24AAACU1122D1Z0',
      address: 'Vapi, Gujarat',
      contactPerson: 'Karan Patel',
      email: 'care@upl-ltd.com',
      mobile: '9123456789'
    });

    const basf = await Company.create({
      name: 'BASF Agricultural Solutions',
      gstNumber: '27AAACB9988H1Z8',
      address: 'Mumbai, Maharashtra',
      contactPerson: 'Vivek Joshi',
      email: 'agri.solutions@basf.com',
      mobile: '9988776655'
    });

    // 3. Create Products (Agriculture Dawai / Fertilizers)
    console.log('Creating products...');
    const p1 = await Product.create({
      name: 'Confidor (Imidacloprid 17.8% SL)',
      sku: 'BAY-CON-100',
      company: bayer._id,
      category: 'Pesticide',
      purchasePrice: 320,
      sellingPrice: 390,
      gstPercentage: 18,
      minStockLevel: 50,
      batches: [
        { batchNumber: 'B-CON772', expiryDate: new Date('2027-04-15'), quantity: 120 },
        { batchNumber: 'B-CON801', expiryDate: new Date('2027-08-30'), quantity: 80 }
      ]
    });

    const p2 = await Product.create({
      name: 'Amistar (Azoxystrobin 23% SC)',
      sku: 'SYN-AMI-250',
      company: syngenta._id,
      category: 'Fungicide',
      purchasePrice: 750,
      sellingPrice: 880,
      gstPercentage: 18,
      minStockLevel: 25,
      batches: [
        { batchNumber: 'S-AMI441', expiryDate: new Date('2026-12-10'), quantity: 45 },
        { batchNumber: 'S-AMI550', expiryDate: new Date('2026-06-30'), quantity: 4 } // Low Stock
      ]
    });

    const p3 = await Product.create({
      name: 'Saaf Fungicide (Carbendazim + Mancozeb)',
      sku: 'UPL-SAF-500',
      company: upl._id,
      category: 'Fungicide',
      purchasePrice: 280,
      sellingPrice: 330,
      gstPercentage: 18,
      minStockLevel: 80,
      batches: [
        { batchNumber: 'U-SAF202', expiryDate: new Date('2027-01-20'), quantity: 150 },
        { batchNumber: 'U-SAF101', expiryDate: new Date('2026-02-15'), quantity: 0 } // Expired & Empty
      ]
    });

    const p4 = await Product.create({
      name: 'RoundUp (Glyphosate 41% SL)',
      sku: 'BAY-ROU-1000',
      company: bayer._id,
      category: 'Herbicide',
      purchasePrice: 420,
      sellingPrice: 495,
      gstPercentage: 18,
      minStockLevel: 40,
      batches: [
        { batchNumber: 'B-ROU551', expiryDate: new Date('2027-05-18'), quantity: 95 }
      ]
    });

    const p5 = await Product.create({
      name: 'NPK 19:19:19 Soluble Fertilizer',
      sku: 'UPL-NPK-1000',
      company: upl._id,
      category: 'Fertilizer',
      purchasePrice: 110,
      sellingPrice: 145,
      gstPercentage: 5,
      minStockLevel: 200,
      batches: [
        { batchNumber: 'U-NPK909', expiryDate: new Date('2028-10-01'), quantity: 450 }
      ]
    });

    const p6 = await Product.create({
      name: 'Cabrio Top (Pyraclostrobin + Metiram)',
      sku: 'BAS-CAB-500',
      company: basf._id,
      category: 'Fungicide',
      purchasePrice: 680,
      sellingPrice: 790,
      gstPercentage: 18,
      minStockLevel: 30,
      batches: [
        { batchNumber: 'BS-CAB112', expiryDate: new Date('2027-03-05'), quantity: 60 }
      ]
    });

    // 4. Create Dealers (Customers)
    console.log('Creating dealers...');
    const d1 = await Dealer.create({
      name: 'Kisan Agro Agency',
      mobile: '9425012345',
      gstNumber: '23AABCK9876D1Z5',
      address: 'Mandi Road, Indore, M.P.',
      creditLimit: 200000,
      outstandingBalance: 45000,
      ledger: []
    });

    const d2 = await Dealer.create({
      name: 'Bharat Fertilizer House',
      mobile: '9826054321',
      gstNumber: '23AABCB5544E2Z9',
      address: 'Bus Stand Square, Ujjain, M.P.',
      creditLimit: 150000,
      outstandingBalance: 20000,
      ledger: []
    });

    const d3 = await Dealer.create({
      name: 'Patel Seeds & Pesticides',
      mobile: '9926411223',
      gstNumber: '23AACCP1100F1Z4',
      address: 'Main Market, Dhar, M.P.',
      creditLimit: 300000,
      outstandingBalance: 0,
      ledger: []
    });

    const d4 = await Dealer.create({
      name: 'GreenField Biotech',
      mobile: '9424887766',
      gstNumber: '23AABCG1212H1Z2',
      address: 'Bhopal Road, Dewas, M.P.',
      creditLimit: 250000,
      outstandingBalance: 75000,
      ledger: []
    });

    // 5. Create Historical Purchases & Sales to populate reports & charts
    console.log('Seeding purchases and sales billing history...');
    
    // Purchases (Stock In)
    // Month 1 (February 2026)
    const pur1 = await Purchase.create({
      company: bayer._id,
      invoiceNumber: 'BAY/26/1021',
      items: [
        {
          product: p1._id,
          quantity: 100,
          rate: 320,
          gstPercentage: 18,
          gstAmount: 5760,
          batchNumber: 'B-CON772',
          expiryDate: new Date('2027-04-15'),
          total: 37760
        }
      ],
      subtotal: 32000,
      gstTotal: 5760,
      grandTotal: 37760,
      date: new Date('2026-02-10')
    });

    // Month 2 (March 2026)
    const pur2 = await Purchase.create({
      company: syngenta._id,
      invoiceNumber: 'SYN/IN/8821',
      items: [
        {
          product: p2._id,
          quantity: 50,
          rate: 750,
          gstPercentage: 18,
          gstAmount: 6750,
          batchNumber: 'S-AMI441',
          expiryDate: new Date('2026-12-10'),
          total: 44250
        }
      ],
      subtotal: 37500,
      gstTotal: 6750,
      grandTotal: 44250,
      date: new Date('2026-03-15')
    });

    // Month 3 (April 2026)
    const pur3 = await Purchase.create({
      company: upl._id,
      invoiceNumber: 'UPL-PUR-301',
      items: [
        {
          product: p3._id,
          quantity: 200,
          rate: 280,
          gstPercentage: 18,
          gstAmount: 10080,
          batchNumber: 'U-SAF202',
          expiryDate: new Date('2027-01-20'),
          total: 66080
        },
        {
          product: p5._id,
          quantity: 500,
          rate: 110,
          gstPercentage: 5,
          gstAmount: 2750,
          batchNumber: 'U-NPK909',
          expiryDate: new Date('2028-10-01'),
          total: 57750
        }
      ],
      subtotal: 110000,
      gstTotal: 12830,
      grandTotal: 122830,
      date: new Date('2026-04-18')
    });

    // Month 4 (May 2026)
    const pur4 = await Purchase.create({
      company: basf._id,
      invoiceNumber: 'BASF/99812',
      items: [
        {
          product: p6._id,
          quantity: 80,
          rate: 680,
          gstPercentage: 18,
          gstAmount: 9792,
          batchNumber: 'BS-CAB112',
          expiryDate: new Date('2027-03-05'),
          total: 64192
        }
      ],
      subtotal: 54400,
      gstTotal: 9792,
      grandTotal: 64192,
      date: new Date('2026-05-12')
    });

    // Invoices (Sales to Dealers)
    // Month 1 (February 2026)
    const inv1 = await Invoice.create({
      invoiceNumber: 'AGRI/2026/0001',
      dealer: d1._id,
      items: [
        {
          product: p1._id,
          batchNumber: 'B-CON772',
          quantity: 30,
          rate: 390,
          gstPercentage: 18,
          gstAmount: 2106,
          discount: 500,
          total: 13306
        }
      ],
      subtotal: 11700,
      gstTotal: 2106,
      discountTotal: 500,
      grandTotal: 13306,
      paymentReceived: 13306,
      status: 'PAID',
      date: new Date('2026-02-15')
    });

    // Month 2 (March 2026)
    const inv2 = await Invoice.create({
      invoiceNumber: 'AGRI/2026/0002',
      dealer: d2._id,
      items: [
        {
          product: p1._id,
          batchNumber: 'B-CON772',
          quantity: 20,
          rate: 390,
          gstPercentage: 18,
          gstAmount: 1404,
          discount: 0,
          total: 9204
        },
        {
          product: p2._id,
          batchNumber: 'S-AMI441',
          quantity: 5,
          rate: 880,
          gstPercentage: 18,
          gstAmount: 792,
          discount: 200,
          total: 4992
        }
      ],
      subtotal: 12200,
      gstTotal: 2196,
      discountTotal: 200,
      grandTotal: 14192,
      paymentReceived: 14192,
      status: 'PAID',
      date: new Date('2026-03-20')
    });

    // Month 3 (April 2026)
    const inv3 = await Invoice.create({
      invoiceNumber: 'AGRI/2026/0003',
      dealer: d4._id,
      items: [
        {
          product: p3._id,
          batchNumber: 'U-SAF202',
          quantity: 50,
          rate: 330,
          gstPercentage: 18,
          gstAmount: 2970,
          discount: 0,
          total: 19470
        },
        {
          product: p5._id,
          batchNumber: 'U-NPK909',
          quantity: 100,
          rate: 145,
          gstPercentage: 5,
          gstAmount: 725,
          discount: 500,
          total: 14725
        }
      ],
      subtotal: 31000,
      gstTotal: 3695,
      discountTotal: 500,
      grandTotal: 34195,
      paymentReceived: 0,
      status: 'UNPAID',
      date: new Date('2026-04-22')
    });

    // Month 4 (May 2026)
    const inv4 = await Invoice.create({
      invoiceNumber: 'AGRI/2026/0004',
      dealer: d1._id,
      items: [
        {
          product: p6._id,
          batchNumber: 'BS-CAB112',
          quantity: 20,
          rate: 790,
          gstPercentage: 18,
          gstAmount: 2844,
          discount: 1000,
          total: 17644
        }
      ],
      subtotal: 15800,
      gstTotal: 2844,
      discountTotal: 1000,
      grandTotal: 17644,
      paymentReceived: 10000,
      status: 'PARTIALLY_PAID',
      date: new Date('2026-05-25')
    });

    // Seed Dealer Ledger Transactions
    console.log('Populating dealer ledgers...');
    
    // Dealer 1 (Kisan Agro)
    d1.ledger = [
      {
        date: new Date('2026-02-15'),
        type: 'SALE',
        amount: 13306,
        referenceId: inv1._id.toString(),
        description: 'Sales Invoice: AGRI/2026/0001'
      },
      {
        date: new Date('2026-02-15'),
        type: 'PAYMENT',
        amount: -13306,
        referenceId: inv1._id.toString(),
        description: 'Payment received against Invoice: AGRI/2026/0001'
      },
      {
        date: new Date('2026-05-25'),
        type: 'SALE',
        amount: 17644,
        referenceId: inv4._id.toString(),
        description: 'Sales Invoice: AGRI/2026/0004'
      },
      {
        date: new Date('2026-05-25'),
        type: 'PAYMENT',
        amount: -10000,
        referenceId: inv4._id.toString(),
        description: 'Payment received against Invoice: AGRI/2026/0004'
      },
      {
        date: new Date('2026-06-01'),
        type: 'SALE',
        amount: 37356, // Carry outstanding balance
        description: 'Previous Outstanding Invoice Balance'
      }
    ];
    d1.outstandingBalance = 45000;
    await d1.save();

    // Dealer 2 (Bharat Fertilizer House)
    d2.ledger = [
      {
        date: new Date('2026-03-20'),
        type: 'SALE',
        amount: 14192,
        referenceId: inv2._id.toString(),
        description: 'Sales Invoice: AGRI/2026/0002'
      },
      {
        date: new Date('2026-03-20'),
        type: 'PAYMENT',
        amount: -14192,
        referenceId: inv2._id.toString(),
        description: 'Payment received against Invoice: AGRI/2026/0002'
      },
      {
        date: new Date('2026-06-02'),
        type: 'SALE',
        amount: 20000,
        description: 'Pending Credit Invoice AGRI/2026/0005'
      }
    ];
    d2.outstandingBalance = 20000;
    await d2.save();

    // Dealer 4 (GreenField Biotech)
    d4.ledger = [
      {
        date: new Date('2026-04-22'),
        type: 'SALE',
        amount: 34195,
        referenceId: inv3._id.toString(),
        description: 'Sales Invoice: AGRI/2026/0003'
      },
      {
        date: new Date('2026-06-03'),
        type: 'SALE',
        amount: 40805,
        description: 'Pending Credit Invoice AGRI/2026/0006'
      }
    ];
    d4.outstandingBalance = 75000;
    await d4.save();

    // Populate StockLogs for initial inventory
    console.log('Writing initial stock logs...');
    // Seed stock logs corresponding to purchases
    const initialLogs = [
      { product: p1._id, batchNumber: 'B-CON772', type: 'IN', quantity: 150, source: 'PURCHASE', referenceId: pur1._id.toString(), details: 'Initial stock addition' },
      { product: p1._id, batchNumber: 'B-CON772', type: 'OUT', quantity: 30, source: 'SALE', referenceId: inv1._id.toString(), details: 'Sale log' },
      { product: p1._id, batchNumber: 'B-CON772', type: 'OUT', quantity: 20, source: 'SALE', referenceId: inv2._id.toString(), details: 'Sale log' },
      { product: p2._id, batchNumber: 'S-AMI441', type: 'IN', quantity: 50, source: 'PURCHASE', referenceId: pur2._id.toString(), details: 'Initial stock addition' },
      { product: p2._id, batchNumber: 'S-AMI441', type: 'OUT', quantity: 5, source: 'SALE', referenceId: inv2._id.toString(), details: 'Sale log' },
      { product: p3._id, batchNumber: 'U-SAF202', type: 'IN', quantity: 200, source: 'PURCHASE', referenceId: pur3._id.toString(), details: 'Initial stock addition' },
      { product: p3._id, batchNumber: 'U-SAF202', type: 'OUT', quantity: 50, source: 'SALE', referenceId: inv3._id.toString(), details: 'Sale log' },
      { product: p5._id, batchNumber: 'U-NPK909', type: 'IN', quantity: 550, source: 'PURCHASE', referenceId: pur3._id.toString(), details: 'Initial stock addition' },
      { product: p5._id, batchNumber: 'U-NPK909', type: 'OUT', quantity: 100, source: 'SALE', referenceId: inv3._id.toString(), details: 'Sale log' },
      { product: p6._id, batchNumber: 'BS-CAB112', type: 'IN', quantity: 80, source: 'PURCHASE', referenceId: pur4._id.toString(), details: 'Initial stock addition' },
      { product: p6._id, batchNumber: 'BS-CAB112', type: 'OUT', quantity: 20, source: 'SALE', referenceId: inv4._id.toString(), details: 'Sale log' }
    ];

    await StockLog.insertMany(initialLogs);

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();
