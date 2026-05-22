// local-db.js - Local Database Adapter with Mock Data

const MOCK_PRODUCTS = [
  { id: "p1", name: "Nasi Goreng Spesial", category: "Makanan", buyPrice: 12000, sellPrice: 20000, sku: "899123456001", stock: 25 },
  { id: "p2", name: "Mie Goreng Ayam", category: "Makanan", buyPrice: 10000, sellPrice: 18000, sku: "899123456002", stock: 15 },
  { id: "p3", name: "Ayam Goreng Kremes", category: "Makanan", buyPrice: 13000, sellPrice: 22000, sku: "899123456003", stock: 4 }, // Stok menipis
  { id: "p4", name: "Es Teh Manis", category: "Minuman", buyPrice: 1500, sellPrice: 5000, sku: "899123456004", stock: 50 },
  { id: "p5", name: "Kopi Susu Aren", category: "Minuman", buyPrice: 4000, sellPrice: 12000, sku: "899123456005", stock: 30 },
  { id: "p6", name: "Jus Alpukat", category: "Minuman", buyPrice: 6000, sellPrice: 15000, sku: "899123456006", stock: 8 },
  { id: "p7", name: "Kentang Goreng", category: "Cemilan", buyPrice: 7000, sellPrice: 12000, sku: "899123456007", stock: 12 },
  { id: "p8", name: "Roti Bakar Cokelat", category: "Cemilan", buyPrice: 5000, sellPrice: 10000, sku: "899123456008", stock: 3 }, // Stok menipis
  { id: "p9", name: "Mineral Water", category: "Minuman", buyPrice: 1000, sellPrice: 3000, sku: "899123456009", stock: 0 } // Stok habis
];

const MOCK_CUSTOMERS = [
  { id: "c1", name: "Budi Santoso", phone: "08123456789", points: 250 },
  { id: "c2", name: "Siti Rahma", phone: "08567890123", points: 120 },
  { id: "c3", name: "Andi Wijaya", phone: "08789012345", points: 45 }
];

const MOCK_USERS = [
  { id: "u1", username: "admin", password: "123", name: "Administrator", role: "Admin" },
  { id: "u2", username: "kasir", password: "123", name: "Kasir Budi", role: "Kasir" }
];

// Helper to generate dummy transactions for the past 7 days to populate the dashboard charts
function generateMockTransactions() {
  const transactions = [];
  const now = new Date();
  const paymentMethods = ["Tunai", "Debit/Kredit", "QRIS/E-Wallet"];
  
  // Create about 20-30 sales scattered across the last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    
    // 3 to 6 sales per day
    const salesCount = Math.floor(Math.random() * 4) + 3;
    for (let s = 0; s < salesCount; s++) {
      const saleDate = new Date(date);
      saleDate.setHours(9 + Math.floor(Math.random() * 11), Math.floor(Math.random() * 60));
      
      const tId = "tx-" + Math.random().toString(36).substr(2, 9);
      const isRegisteredCustomer = Math.random() > 0.4;
      const customer = isRegisteredCustomer ? MOCK_CUSTOMERS[Math.floor(Math.random() * MOCK_CUSTOMERS.length)] : null;
      
      // select 1-3 random products
      const txItems = [];
      const itemTypes = Math.floor(Math.random() * 3) + 1;
      let subtotal = 0;
      let totalCost = 0;
      
      const availableProducts = [...MOCK_PRODUCTS];
      for (let item = 0; item < itemTypes; item++) {
        if (availableProducts.length === 0) break;
        const prodIndex = Math.floor(Math.random() * availableProducts.length);
        const prod = availableProducts.splice(prodIndex, 1)[0];
        const qty = Math.floor(Math.random() * 2) + 1;
        
        txItems.push({
          productId: prod.id,
          name: prod.name,
          qty: qty,
          sellPrice: prod.sellPrice,
          buyPrice: prod.buyPrice,
          subtotal: prod.sellPrice * qty
        });
        subtotal += prod.sellPrice * qty;
        totalCost += prod.buyPrice * qty;
      }
      
      const discount = Math.random() > 0.7 ? (Math.random() > 0.5 ? 5000 : Math.round(subtotal * 0.1 / 1000) * 1000) : 0;
      const afterDiscount = Math.max(0, subtotal - discount);
      const tax = Math.round(afterDiscount * 0.11);
      const total = afterDiscount + tax;
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const cashReceived = paymentMethod === "Tunai" ? Math.ceil(total / 10000) * 10000 : total;
      
      transactions.push({
        id: tId,
        timestamp: saleDate.toISOString(),
        items: txItems,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        total: total,
        totalCost: totalCost,
        paymentMethod: paymentMethod,
        customerId: customer ? customer.id : "",
        customerName: customer ? customer.name : "Umum",
        cashierName: Math.random() > 0.5 ? "Kasir Budi" : "Administrator",
        shiftId: "shift-mock",
        cashReceived: cashReceived,
        cashChange: cashReceived - total
      });
    }
  }
  
  return transactions;
}

// Initialise Local Data Keys if not exists
function initLocalDatabase() {
  if (!localStorage.getItem("aeropos_products")) {
    localStorage.setItem("aeropos_products", JSON.stringify(MOCK_PRODUCTS));
  }
  if (!localStorage.getItem("aeropos_customers")) {
    localStorage.setItem("aeropos_customers", JSON.stringify(MOCK_CUSTOMERS));
  }
  if (!localStorage.getItem("aeropos_users")) {
    localStorage.setItem("aeropos_users", JSON.stringify(MOCK_USERS));
  }
  if (!localStorage.getItem("aeropos_transactions")) {
    localStorage.setItem("aeropos_transactions", JSON.stringify(generateMockTransactions()));
  }
  if (!localStorage.getItem("aeropos_shifts")) {
    localStorage.setItem("aeropos_shifts", JSON.stringify([]));
  }
}

// Invoke instantly
initLocalDatabase();

// Export Local Storage actions
const LocalDB = {
  // Products
  getProducts() {
    return JSON.parse(localStorage.getItem("aeropos_products")) || [];
  },
  saveProduct(product) {
    const products = this.getProducts();
    if (product.id) {
      // Edit
      const index = products.findIndex(p => p.id === product.id);
      if (index !== -1) products[index] = product;
    } else {
      // Add
      product.id = "p-" + Math.random().toString(36).substr(2, 9);
      products.push(product);
    }
    localStorage.setItem("aeropos_products", JSON.stringify(products));
    return product;
  },
  deleteProduct(id) {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    localStorage.setItem("aeropos_products", JSON.stringify(filtered));
  },
  updateStock(productId, qtyUsed) {
    const products = this.getProducts();
    const index = products.findIndex(p => p.id === productId);
    if (index !== -1) {
      products[index].stock = Math.max(0, products[index].stock - qtyUsed);
      localStorage.setItem("aeropos_products", JSON.stringify(products));
      return products[index];
    }
    return null;
  },

  // Customers
  getCustomers() {
    return JSON.parse(localStorage.getItem("aeropos_customers")) || [];
  },
  saveCustomer(customer) {
    const customers = this.getCustomers();
    if (customer.id) {
      const index = customers.findIndex(c => c.id === customer.id);
      if (index !== -1) customers[index] = customer;
    } else {
      customer.id = "c-" + Math.random().toString(36).substr(2, 9);
      customer.points = customer.points || 0;
      customers.push(customer);
    }
    localStorage.setItem("aeropos_customers", JSON.stringify(customers));
    return customer;
  },
  deleteCustomer(id) {
    const customers = this.getCustomers();
    const filtered = customers.filter(c => c.id !== id);
    localStorage.setItem("aeropos_customers", JSON.stringify(filtered));
  },
  addLoyaltyPoints(customerId, pointsToAdd) {
    if (!customerId) return;
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
      customers[index].points = (customers[index].points || 0) + pointsToAdd;
      localStorage.setItem("aeropos_customers", JSON.stringify(customers));
      return customers[index];
    }
  },

  // Transactions
  getTransactions() {
    return JSON.parse(localStorage.getItem("aeropos_transactions")) || [];
  },
  saveTransaction(transaction) {
    const transactions = this.getTransactions();
    transaction.id = transaction.id || "tx-" + Math.random().toString(36).substr(2, 9);
    transaction.timestamp = transaction.timestamp || new Date().toISOString();
    transactions.push(transaction);
    localStorage.setItem("aeropos_transactions", JSON.stringify(transactions));
    
    // Auto adjust stock
    transaction.items.forEach(item => {
      this.updateStock(item.productId, item.qty);
    });

    // Deduct used loyalty points if applicable
    if (transaction.customerId && transaction.usedPoints) {
      this.addLoyaltyPoints(transaction.customerId, -transaction.usedPoints);
    }

    // Auto add CRM points (1 point per Rp 10.000 spent)
    if (transaction.customerId && transaction.total >= 10000) {
      const points = Math.floor(transaction.total / 10000);
      this.addLoyaltyPoints(transaction.customerId, points);
    }
    
    return transaction;
  },

  // Shifts
  getShifts() {
    return JSON.parse(localStorage.getItem("aeropos_shifts")) || [];
  },
  saveShift(shift) {
    const shifts = this.getShifts();
    if (shift.id) {
      const index = shifts.findIndex(s => s.id === shift.id);
      if (index !== -1) shifts[index] = shift;
    } else {
      shift.id = "shift-" + Math.random().toString(36).substr(2, 9);
      shifts.push(shift);
    }
    localStorage.setItem("aeropos_shifts", JSON.stringify(shifts));
    return shift;
  },
  getActiveShift() {
    const shifts = this.getShifts();
    return shifts.find(s => s.status === "Aktif") || null;
  },

  // Users / Roles
  getUsers() {
    return JSON.parse(localStorage.getItem("aeropos_users")) || [];
  },
  
  // Bulk Data Utilities for Firebase Syncing
  resetAllData() {
    localStorage.removeItem("aeropos_products");
    localStorage.removeItem("aeropos_customers");
    localStorage.removeItem("aeropos_transactions");
    localStorage.removeItem("aeropos_shifts");
    localStorage.removeItem("aeropos_users");
    initLocalDatabase();
  }
};

window.LocalDB = LocalDB; // Make accessible globally
