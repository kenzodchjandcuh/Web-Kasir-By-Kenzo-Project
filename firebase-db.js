// firebase-db.js - Firebase Realtime Database Adapter with Offline-First Support

let app = null;
let db = null;
let firebaseConfig = null;
let isConnected = false;
let fstore = {}; // Module-level cache for Realtime Database functions to prevent redundant dynamic imports

let activeListeners = {
  products: null,
  customers: null,
  transactions: null,
  shifts: null
};

function clearActiveListeners() {
  if (activeListeners.products) {
    try { activeListeners.products(); } catch (e) { console.error("Error unsubscribing products:", e); }
    activeListeners.products = null;
  }
  if (activeListeners.customers) {
    try { activeListeners.customers(); } catch (e) { console.error("Error unsubscribing customers:", e); }
    activeListeners.customers = null;
  }
  if (activeListeners.transactions) {
    try { activeListeners.transactions(); } catch (e) { console.error("Error unsubscribing transactions:", e); }
    activeListeners.transactions = null;
  }
  if (activeListeners.shifts) {
    try { activeListeners.shifts(); } catch (e) { console.error("Error unsubscribing shifts:", e); }
    activeListeners.shifts = null;
  }
}

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBIZeApEJE-A-EncQqdSvlVUDZrrUqfGLI",
  authDomain: "kasir-4f784.firebaseapp.com",
  databaseURL: "https://kasir-4f784-default-rtdb.firebaseio.com",
  projectId: "kasir-4f784",
  storageBucket: "kasir-4f784.firebasestorage.app",
  messagingSenderId: "775568101349",
  appId: "1:775568101349:web:44632c447c552c84c1690c",
  measurementId: "G-G97X08N8D3"
};

// Check if configuration exists in LocalStorage, otherwise use default configuration
function loadFirebaseConfig() {
  const storedConfig = localStorage.getItem("aeropos_firebase_config");
  if (storedConfig) {
    try {
      const parsed = JSON.parse(storedConfig);
      // Clean up/upgrade from the old project ID if it was stored
      if (parsed && parsed.projectId === "kasir-f61e5") {
        localStorage.removeItem("aeropos_firebase_config");
      } else {
        firebaseConfig = parsed;
        return true;
      }
    } catch (e) {
      console.error("Gagal membaca konfigurasi Firebase dari localStorage:", e);
    }
  }

  // Use default fallback config
  firebaseConfig = DEFAULT_FIREBASE_CONFIG;
  return true;
}

// Try to initialize Firebase Realtime Database
async function initFirebase() {
  if (!loadFirebaseConfig()) {
    isConnected = false;
    return false;
  }

  try {
    // Dynamically import Firebase libraries
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
    const rtdb = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js");

    app = initializeApp(firebaseConfig);
    db = rtdb.getDatabase(app);
    fstore = rtdb;
    isConnected = true;

    console.log("Firebase Terkoneksi (Realtime Database)!");
    return true;
  } catch (error) {
    console.error("Gagal inisialisasi Firebase Realtime Database:", error);
    isConnected = false;
    return false;
  }
}

// Initialize on load
const initPromise = initFirebase();

const FirebaseDB = {
  get initPromise() {
    return initPromise;
  },

  get isConnected() {
    return isConnected;
  },

  get db() {
    return db;
  },

  get config() {
    return firebaseConfig;
  },

  async reinitialize(newConfig) {
    localStorage.setItem("aeropos_firebase_config", JSON.stringify(newConfig));
    const success = await initFirebase();
    return success;
  },

  disconnect() {
    clearActiveListeners();
    localStorage.removeItem("aeropos_firebase_config");
    app = null;
    db = null;
    isConnected = false;
  },

  // Products
  async getProducts() {
    if (!isConnected) return [];
    try {
      const { ref, get } = fstore;
      const snapshot = await get(ref(db, "products"));
      if (!snapshot.exists()) return [];
      const val = snapshot.val();
      if (Array.isArray(val)) {
        return val.filter(Boolean);
      }
      return Object.keys(val).map(key => ({ id: key, ...val[key] }));
    } catch (e) {
      console.error("Firebase getProducts error:", e);
      throw e;
    }
  },

  async saveProduct(product) {
    if (!isConnected) return null;
    try {
      const { ref, set, push } = fstore;
      const id = product.id || push(ref(db, "products")).key;
      const refPath = "products/" + id;
      const productData = { ...product, id };
      await set(ref(db, refPath), productData);
      return productData;
    } catch (e) {
      console.error("Firebase saveProduct error:", e);
      throw e;
    }
  },

  async deleteProduct(id) {
    if (!isConnected) return;
    try {
      const { ref, remove } = fstore;
      await remove(ref(db, "products/" + id));
    } catch (e) {
      console.error("Firebase deleteProduct error:", e);
      throw e;
    }
  },

  async updateStock(productId, qtyUsed) {
    if (!isConnected) return;
    try {
      const { ref, get, update } = fstore;
      const productRef = ref(db, "products/" + productId);
      const snap = await get(productRef);
      if (snap.exists()) {
        const currentStock = snap.val().stock || 0;
        const newStock = Math.max(0, currentStock - qtyUsed);
        await update(productRef, { stock: newStock });
      }
    } catch (e) {
      console.error("Firebase updateStock error:", e);
    }
  },

  // Customers
  async getCustomers() {
    if (!isConnected) return [];
    try {
      const { ref, get } = fstore;
      const snapshot = await get(ref(db, "customers"));
      if (!snapshot.exists()) return [];
      const val = snapshot.val();
      if (Array.isArray(val)) {
        return val.filter(Boolean);
      }
      return Object.keys(val).map(key => ({ id: key, ...val[key] }));
    } catch (e) {
      console.error("Firebase getCustomers error:", e);
      throw e;
    }
  },

  async saveCustomer(customer) {
    if (!isConnected) return null;
    try {
      const { ref, set, push } = fstore;
      const id = customer.id || push(ref(db, "customers")).key;
      const refPath = "customers/" + id;
      const customerData = { ...customer, id };
      await set(ref(db, refPath), customerData);
      return customerData;
    } catch (e) {
      console.error("Firebase saveCustomer error:", e);
      throw e;
    }
  },

  async deleteCustomer(id) {
    if (!isConnected) return;
    try {
      const { ref, remove } = fstore;
      await remove(ref(db, "customers/" + id));
    } catch (e) {
      console.error("Firebase deleteCustomer error:", e);
      throw e;
    }
  },

  async addLoyaltyPoints(customerId, pointsToAdd) {
    if (!isConnected || !customerId) return;
    try {
      const { ref, get, update } = fstore;
      const customerRef = ref(db, "customers/" + customerId);
      const snap = await get(customerRef);
      if (snap.exists()) {
        const currentPoints = snap.val().points || 0;
        await update(customerRef, { points: currentPoints + pointsToAdd });
      }
    } catch (e) {
      console.error("Firebase addLoyaltyPoints error:", e);
    }
  },

  // Transactions
  async getTransactions() {
    if (!isConnected) return [];
    try {
      const { ref, get } = fstore;
      const snapshot = await get(ref(db, "transactions"));
      if (!snapshot.exists()) return [];
      const val = snapshot.val();
      const transactions = Array.isArray(val)
        ? val.filter(Boolean)
        : Object.keys(val).map(key => ({ id: key, ...val[key] }));
      return transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (e) {
      console.error("Firebase getTransactions error:", e);
      throw e;
    }
  },

  async saveTransaction(transaction) {
    if (!isConnected) return null;
    try {
      const { ref, set, push } = fstore;
      const id = transaction.id || push(ref(db, "transactions")).key;
      const transactionData = {
        ...transaction,
        id,
        timestamp: transaction.timestamp || new Date().toISOString()
      };
      await set(ref(db, "transactions/" + id), transactionData);

      // Decrement stocks & add loyalty points on-the-fly
      transaction.items.forEach(item => {
        FirebaseDB.updateStock(item.productId, item.qty);
      });

      if (transaction.customerId) {
        if (transaction.usedPoints) {
          FirebaseDB.addLoyaltyPoints(transaction.customerId, -transaction.usedPoints);
        }
        if (transaction.total >= 10000) {
          const points = Math.floor(transaction.total / 10000);
          FirebaseDB.addLoyaltyPoints(transaction.customerId, points);
        }
      }

      return transactionData;
    } catch (e) {
      console.error("Firebase saveTransaction error:", e);
      throw e;
    }
  },

  // Shifts
  async getShifts() {
    if (!isConnected) return [];
    try {
      const { ref, get } = fstore;
      const snapshot = await get(ref(db, "shifts"));
      if (!snapshot.exists()) return [];
      const val = snapshot.val();
      const shifts = Array.isArray(val)
        ? val.filter(Boolean)
        : Object.keys(val).map(key => ({ id: key, ...val[key] }));
      return shifts.sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
    } catch (e) {
      console.error("Firebase getShifts error:", e);
      throw e;
    }
  },

  async saveShift(shift) {
    if (!isConnected) return null;
    try {
      const { ref, set, push } = fstore;
      const id = shift.id || push(ref(db, "shifts")).key;
      const shiftData = { ...shift, id };
      await set(ref(db, "shifts/" + id), shiftData);
      return shiftData;
    } catch (e) {
      console.error("Firebase saveShift error:", e);
      throw e;
    }
  },

  async getActiveShift() {
    if (!isConnected) return null;
    const shifts = await FirebaseDB.getShifts();
    return shifts.find(s => s.status === "Aktif") || null;
  },

  // Sync / Migration tool: Pushes local storage data into Firebase Realtime Database
  async migrateLocalData(onProgress) {
    if (!isConnected) return false;
    try {
      const { ref, set } = fstore;

      const localProducts = window.LocalDB.getProducts();
      const localCustomers = window.LocalDB.getCustomers();
      const localTransactions = window.LocalDB.getTransactions();
      const localShifts = window.LocalDB.getShifts();

      const totalItems = localProducts.length + localCustomers.length + localTransactions.length + localShifts.length;
      let completedItems = 0;

      const reportProgress = () => {
        completedItems++;
        if (onProgress) {
          onProgress(Math.round((completedItems / totalItems) * 100));
        }
      };

      // Migrate Products
      for (const p of localProducts) {
        await set(ref(db, "products/" + p.id), p);
        reportProgress();
      }

      // Migrate Customers
      for (const c of localCustomers) {
        await set(ref(db, "customers/" + c.id), c);
        reportProgress();
      }

      // Migrate Transactions
      for (const t of localTransactions) {
        await set(ref(db, "transactions/" + t.id), t);
        reportProgress();
      }

      // Migrate Shifts
      for (const s of localShifts) {
        await set(ref(db, "shifts/" + s.id), s);
        reportProgress();
      }

      return true;
    } catch (e) {
      console.error("Migration error:", e);
      return false;
    }
  },

  setupRealtimeListeners(callbacks) {
    if (!isConnected) return;
    clearActiveListeners();

    try {
      const { ref, onValue } = fstore;

      // 1. Products
      if (callbacks.onProducts) {
        activeListeners.products = onValue(ref(db, "products"), (snapshot) => {
          if (!snapshot.exists()) {
            callbacks.onProducts([]);
            return;
          }
          const val = snapshot.val();
          const list = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.keys(val).map(key => ({ id: key, ...val[key] }));
          callbacks.onProducts(list);
        }, (error) => {
          console.error("Firebase products sync error:", error);
        });
      }

      // 2. Customers
      if (callbacks.onCustomers) {
        activeListeners.customers = onValue(ref(db, "customers"), (snapshot) => {
          if (!snapshot.exists()) {
            callbacks.onCustomers([]);
            return;
          }
          const val = snapshot.val();
          const list = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.keys(val).map(key => ({ id: key, ...val[key] }));
          callbacks.onCustomers(list);
        }, (error) => {
          console.error("Firebase customers sync error:", error);
        });
      }

      // 3. Transactions
      if (callbacks.onTransactions) {
        activeListeners.transactions = onValue(ref(db, "transactions"), (snapshot) => {
          if (!snapshot.exists()) {
            callbacks.onTransactions([]);
            return;
          }
          const val = snapshot.val();
          const list = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.keys(val).map(key => ({ id: key, ...val[key] }));
          list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          callbacks.onTransactions(list);
        }, (error) => {
          console.error("Firebase transactions sync error:", error);
        });
      }

      // 4. Shifts
      if (callbacks.onShifts) {
        activeListeners.shifts = onValue(ref(db, "shifts"), (snapshot) => {
          if (!snapshot.exists()) {
            callbacks.onShifts([]);
            return;
          }
          const val = snapshot.val();
          const list = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.keys(val).map(key => ({ id: key, ...val[key] }));
          list.sort((a, b) => new Date(b.openedAt || 0) - new Date(a.openedAt || 0));
          callbacks.onShifts(list);
        }, (error) => {
          console.error("Firebase shifts sync error:", error);
        });
      }
    } catch (err) {
      console.error("Gagal mendaftarkan listener real-time Firebase:", err);
    }
  }
};

window.FirebaseDB = FirebaseDB; // Make accessible globally
export default FirebaseDB;
export { initFirebase };
