// app.js - AeroPOS Core Controller & State Engine

// Wrapper to dynamically route data operations between Firebase or LocalStorage
// Wrapper to dynamically route data operations between Firebase or LocalStorage with local caching
const DB = {
  async getProducts() {
    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      try {
        const products = await window.FirebaseDB.getProducts();
        const localProducts = window.LocalDB.getProducts();
        if (products.length > 0 || localProducts.length === 0) {
          localStorage.setItem("aeropos_products", JSON.stringify(products));
          return products;
        } else {
          console.log("Firebase products empty, keeping local products for migration.");
          return localProducts;
        }
      } catch (err) {
        console.warn("Gagal mengambil produk dari Firebase, menggunakan data lokal:", err);
      }
    }
    return window.LocalDB.getProducts();
  },

  async saveProduct(product) {
    const savedLocal = window.LocalDB.saveProduct(product);
    
    // Update in-memory cache state immediately
    const idx = state.products.findIndex(p => p.id === savedLocal.id);
    if (idx !== -1) {
      state.products[idx] = savedLocal;
    } else {
      state.products.push(savedLocal);
    }

    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      window.FirebaseDB.saveProduct(savedLocal).catch(err => {
        console.error("Gagal menyinkronkan produk ke Firebase:", err);
        showToast("Sinkronisasi produk ke Firebase gagal, disimpan lokal.", "warning");
      });
    }
    return savedLocal;
  },

  async deleteProduct(id) {
    window.LocalDB.deleteProduct(id);
    
    // Update in-memory cache state immediately
    state.products = state.products.filter(p => p.id !== id);

    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      window.FirebaseDB.deleteProduct(id).catch(err => {
        console.error("Gagal menghapus produk di Firebase:", err);
        showToast("Sinkronisasi penghapusan produk ke Firebase gagal.", "warning");
      });
    }
  },

  async getCustomers() {
    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      try {
        const customers = await window.FirebaseDB.getCustomers();
        const localCustomers = window.LocalDB.getCustomers();
        if (customers.length > 0 || localCustomers.length === 0) {
          localStorage.setItem("aeropos_customers", JSON.stringify(customers));
          return customers;
        } else {
          console.log("Firebase customers empty, keeping local customers for migration.");
          return localCustomers;
        }
      } catch (err) {
        console.warn("Gagal mengambil pelanggan dari Firebase, menggunakan data lokal:", err);
      }
    }
    return window.LocalDB.getCustomers();
  },

  async saveCustomer(customer) {
    const savedLocal = window.LocalDB.saveCustomer(customer);

    // Update in-memory cache state immediately
    const idx = state.customers.findIndex(c => c.id === savedLocal.id);
    if (idx !== -1) {
      state.customers[idx] = savedLocal;
    } else {
      state.customers.push(savedLocal);
    }

    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      window.FirebaseDB.saveCustomer(savedLocal).catch(err => {
        console.error("Gagal menyinkronkan pelanggan ke Firebase:", err);
        showToast("Sinkronisasi pelanggan ke Firebase gagal, disimpan lokal.", "warning");
      });
    }
    return savedLocal;
  },

  async getTransactions() {
    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      try {
        const transactions = await window.FirebaseDB.getTransactions();
        const localTransactions = window.LocalDB.getTransactions();
        if (transactions.length > 0 || localTransactions.length === 0) {
          localStorage.setItem("aeropos_transactions", JSON.stringify(transactions));
          return transactions;
        } else {
          console.log("Firebase transactions empty, keeping local transactions for migration.");
          return localTransactions;
        }
      } catch (err) {
        console.warn("Gagal mengambil transaksi dari Firebase, menggunakan data lokal:", err);
      }
    }
    return window.LocalDB.getTransactions();
  },

  async saveTransaction(transaction) {
    const savedLocal = window.LocalDB.saveTransaction(transaction);

    // Update in-memory cache state immediately
    state.transactions.unshift(savedLocal);

    // Update stocks in memory (since LocalDB.saveTransaction does it on disk, we must do it in memory)
    savedLocal.items.forEach(item => {
      const idx = state.products.findIndex(p => p.id === item.productId);
      if (idx !== -1) {
        state.products[idx].stock = Math.max(0, state.products[idx].stock - item.qty);
      }
    });

    // Update loyalty points in memory
    if (savedLocal.customerId && savedLocal.total >= 10000) {
      const points = Math.floor(savedLocal.total / 10000);
      const custIdx = state.customers.findIndex(c => c.id === savedLocal.customerId);
      if (custIdx !== -1) {
        state.customers[custIdx].points = (state.customers[custIdx].points || 0) + points;
      }
    }

    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      window.FirebaseDB.saveTransaction(savedLocal).catch(err => {
        console.error("Gagal menyinkronkan transaksi ke Firebase:", err);
        showToast("Sinkronisasi transaksi ke Firebase gagal, disimpan lokal.", "warning");
      });
    }
    return savedLocal;
  },

  async getShifts() {
    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      try {
        const shifts = await window.FirebaseDB.getShifts();
        const localShifts = window.LocalDB.getShifts();
        if (shifts.length > 0 || localShifts.length === 0) {
          localStorage.setItem("aeropos_shifts", JSON.stringify(shifts));
          return shifts;
        } else {
          console.log("Firebase shifts empty, keeping local shifts for migration.");
          return localShifts;
        }
      } catch (err) {
        console.warn("Gagal mengambil shifts dari Firebase, menggunakan data lokal:", err);
      }
    }
    return window.LocalDB.getShifts();
  },

  async saveShift(shift) {
    const savedLocal = window.LocalDB.saveShift(shift);

    // Update in-memory cache state immediately
    const idx = state.shifts.findIndex(s => s.id === savedLocal.id);
    if (idx !== -1) {
      state.shifts[idx] = savedLocal;
    } else {
      state.shifts.push(savedLocal);
    }
    if (state.activeShift && state.activeShift.id === savedLocal.id) {
      state.activeShift = savedLocal;
    }

    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      window.FirebaseDB.saveShift(savedLocal).catch(err => {
        console.error("Gagal menyinkronkan shift ke Firebase:", err);
        showToast("Sinkronisasi shift ke Firebase gagal, disimpan lokal.", "warning");
      });
    }
    return savedLocal;
  },

  async getActiveShift() {
    if (window.FirebaseDB && window.FirebaseDB.isConnected) {
      try {
        const shift = await window.FirebaseDB.getActiveShift();
        return shift;
      } catch (err) {
        console.warn("Gagal mengambil active shift dari Firebase, menggunakan data lokal:", err);
      }
    }
    return window.LocalDB.getActiveShift();
  }
};

// Global App State
const state = {
  activeTab: 'kasir',
  cart: [],
  products: [],
  customers: [],
  transactions: [],
  shifts: [],
  activeShift: null,
  currentUser: null,
  storeProfile: {
    name: 'AeroPOS Store',
    address: 'Jl. Raya POS No. 123, Jakarta',
    phone: '081234567890',
    footer: 'Terima kasih atas kunjungan Anda!'
  },
  qrisTimer: null,
  charts: {
    dailySales: null,
    bestSellers: null
  },
  reportCurrentPage: 1
};

// ================= UTILITIES & HELPERS =================

// Format number as Indonesian Rupiah (Rp)
function formatRupiah(number) {
  return 'Rp ' + Number(number).toLocaleString('id-ID');
}

// Generate Daily Authorization Code
function getDailyAuthCode() {
  return btoa(new Date().toISOString().split('T')[0] + "AEROPOS").substring(0, 6).toUpperCase();
}

// Show custom toast notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-holder');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-circle-check';
  if (type === 'warning') icon = 'fa-circle-exclamation';
  if (type === 'error') icon = 'fa-circle-xmark';
  
  toast.innerHTML = `
    <i class="fa-solid ${icon} toast-icon"></i>
    <span class="toast-message">${message}</span>
  `;
  
  container.appendChild(toast);
  
  // Trigger transition
  setTimeout(() => toast.classList.add('show'), 50);
  
  // Auto remove toast
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helper to safely bind events to DOM elements that may not exist on all roles/pages
function bindEvent(id, eventName, handler) {
  const el = document.getElementById(id);
  if (el) {
    el.addEventListener(eventName, handler);
  }
}

// Custom Modal controller
function openModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.add('active');
}

// Custom Modal closer
function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
  // Clear QRIS simulation timeout if active
  if (modalId === 'modal-checkout' && state.qrisTimer) {
    clearTimeout(state.qrisTimer);
    state.qrisTimer = null;
  }
}

// Get User Profile Details
function loadStoreProfile() {
  const stored = localStorage.getItem('aeropos_store_profile');
  if (stored) {
    try {
      state.storeProfile = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }
  }
  
  if (!state.storeProfile) state.storeProfile = {};

  // Set in Settings form (guarded)
  const nameEl = document.getElementById('set-store-name');
  const addressEl = document.getElementById('set-store-address');
  const phoneEl = document.getElementById('set-store-phone');
  const footerEl = document.getElementById('set-store-footer');

  if (nameEl) nameEl.value = state.storeProfile.name || 'AeroPOS Store';
  if (addressEl) addressEl.value = state.storeProfile.address || 'Jakarta';
  if (phoneEl) phoneEl.value = state.storeProfile.phone || '081234567890';
  if (footerEl) footerEl.value = state.storeProfile.footer || 'Terima kasih!';

  // Logo preview
  const logoPreview = document.getElementById('set-store-logo-preview');
  const logoPlaceholder = document.getElementById('set-store-logo-placeholder');
  const logoRemoveBtn = document.getElementById('set-store-logo-remove');

  if (state.storeProfile.logo) {
    if (logoPreview) {
      logoPreview.src = state.storeProfile.logo;
      logoPreview.style.display = 'block';
    }
    if (logoPlaceholder) logoPlaceholder.style.display = 'none';
    if (logoRemoveBtn) logoRemoveBtn.style.display = 'inline-block';
  } else {
    if (logoPreview) logoPreview.style.display = 'none';
    if (logoPlaceholder) logoPlaceholder.style.display = 'flex';
    if (logoRemoveBtn) logoRemoveBtn.style.display = 'none';
  }

  updateStoreUI();
}

function updateStoreUI() {
  const brandIcons = document.querySelectorAll('#sidebar-brand-icon, #login-brand-icon');
  const brandNames = document.querySelectorAll('#sidebar-brand-name, #login-brand-title');

  brandIcons.forEach(icon => {
    if (state.storeProfile.logo) {
      icon.innerHTML = `<img src="${state.storeProfile.logo}" style="width:100%; height:100%; object-fit:cover; border-radius:inherit;">`;
      icon.style.background = 'transparent';
      icon.style.boxShadow = 'none';
    } else {
      icon.innerHTML = 'A';
      icon.style.background = 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)';
    }
  });

  brandNames.forEach(nameEl => {
    nameEl.textContent = state.storeProfile.name || 'AeroPOS';
  });

  // Update Favicon
  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement('link');
    favicon.rel = 'icon';
    document.head.appendChild(favicon);
  }
  
  if (state.storeProfile.logo) {
    favicon.href = state.storeProfile.logo;
  } else {
    favicon.href = 'favicon.ico';
  }
}

// ================= APPLICATION CORE INIT =================

document.addEventListener('DOMContentLoaded', async () => {
  // Load initial settings
  loadStoreProfile();
  
  // Load Current User Session
  const userSession = sessionStorage.getItem('aeropos_current_user');
  if (!userSession) {
    window.location.href = 'index.html';
    return;
  }
  try {
    state.currentUser = JSON.parse(userSession);
  } catch (e) {
    window.location.href = 'index.html';
    return;
  }
  updateSidebarUserBadge();

  // Load database entities locally first (Instant Boot)
  state.products = window.LocalDB.getProducts();
  state.customers = window.LocalDB.getCustomers();
  state.transactions = window.LocalDB.getTransactions();
  state.shifts = window.LocalDB.getShifts();
  state.activeShift = window.LocalDB.getActiveShift();

  // Route tab handlers
  document.querySelectorAll('nav .nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetTab = e.currentTarget.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });

  // Enforce Shift Check
  checkActiveShiftState();

  // Render POS interface immediately using local cache
  renderCategoryPills();
  renderCatalogGrid();
  renderCart();
  populateCustomerDropdowns();

  // Register General Event Listeners
  setupFormListeners();
  setupButtonListeners();
  setupKeyboardHotkeys();
  updateConnectionStatusUI();

  // Async load Firebase in background
  if (window.FirebaseDB && window.FirebaseDB.initPromise) {
    window.FirebaseDB.initPromise.then(() => {
      if (window.FirebaseDB.isConnected) {
        console.log("Firebase initialized in background, starting real-time sync...");
        setupFirebaseSyncListeners();
        updateConnectionStatusUI();
      }
    }).catch(e => {
      console.warn("Background Firebase init failed:", e);
    });
  }
  
  // Periodically check Firebase Connection Status to update UI
  setInterval(updateConnectionStatusUI, 3000);
});

// Refresh memory data from DB using parallel Promise.all
async function refreshAppData() {
  try {
    const [products, customers, transactions, shifts] = await Promise.all([
      DB.getProducts(),
      DB.getCustomers(),
      DB.getTransactions(),
      DB.getShifts()
    ]);
    state.products = products;
    state.customers = customers;
    state.transactions = transactions;
    state.shifts = shifts;
    // Find active shift directly from shifts array in memory
    state.activeShift = shifts.find(s => s.status === "Aktif") || null;
  } catch (err) {
    console.warn("DB refresh error, falling back to LocalDB:", err);
    state.products = window.LocalDB.getProducts();
    state.customers = window.LocalDB.getCustomers();
    state.transactions = window.LocalDB.getTransactions();
    state.shifts = window.LocalDB.getShifts();
    state.activeShift = window.LocalDB.getActiveShift();
  }
}

// Setup Real-time Firebase Synchronization Listeners
function setupFirebaseSyncListeners() {
  if (!window.FirebaseDB || !window.FirebaseDB.isConnected) return;

  console.log("Mendaftarkan listener sinkronisasi real-time Firebase...");
  window.FirebaseDB.setupRealtimeListeners({
    onProducts: (products) => {
      console.log("Realtime Sync: Produk ter-update dari Firebase", products);
      localStorage.setItem("aeropos_products", JSON.stringify(products));
      state.products = products;
      
      // Update catalog & inventory UI
      renderCategoryPills();
      renderCatalogGrid();
      if (state.activeTab === 'inventaris') renderInventoryTable();
    },
    onCustomers: (customers) => {
      console.log("Realtime Sync: Pelanggan ter-update dari Firebase", customers);
      localStorage.setItem("aeropos_customers", JSON.stringify(customers));
      state.customers = customers;
      
      // Update CRM UI
      populateCustomerDropdowns();
      if (state.activeTab === 'pelanggan') renderCustomerTable();
    },
    onTransactions: (transactions) => {
      console.log("Realtime Sync: Transaksi ter-update dari Firebase", transactions);
      localStorage.setItem("aeropos_transactions", JSON.stringify(transactions));
      state.transactions = transactions;
      
      // Update reports UI
      if (state.activeTab === 'laporan') renderLaporanDashboard();
    },
    onShifts: (shifts) => {
      console.log("Realtime Sync: Shift ter-update dari Firebase", shifts);
      localStorage.setItem("aeropos_shifts", JSON.stringify(shifts));
      state.shifts = shifts;
      state.activeShift = shifts.find(s => s.status === "Aktif") || null;
      
      // Update shifts UI
      checkActiveShiftState();
      if (state.activeTab === 'shift') renderShiftTabDetails();
    }
  });
}

// Update connection status badge
function updateConnectionStatusUI() {
  const banner = document.getElementById('connection-banner');
  const statusText = document.getElementById('connection-status-text');
  
  const connectedDiv = document.getElementById('settings-firebase-connected');
  const disconnectedDiv = document.getElementById('settings-firebase-disconnected');
  const activeProjectId = document.getElementById('settings-active-project-id');

  if (window.FirebaseDB && window.FirebaseDB.isConnected) {
    if (navigator.onLine) {
      if (banner) banner.className = 'connection-banner';
      if (statusText) statusText.innerHTML = '<i class="fa-solid fa-cloud"></i> Firebase Cloud (Online)';
    } else {
      if (banner) banner.className = 'connection-banner offline';
      if (statusText) statusText.innerHTML = '<i class="fa-solid fa-cloud-sun"></i> Firebase Cloud (Offline Cache)';
    }
    
    // Settings panel adjust
    if (connectedDiv) connectedDiv.style.display = 'block';
    if (disconnectedDiv) disconnectedDiv.style.display = 'none';
    
    const config = (window.FirebaseDB && window.FirebaseDB.config) || {};
    if (activeProjectId) activeProjectId.textContent = `Project ID: ${config.projectId || 'N/A'}`;
  } else {
    if (banner) banner.className = 'connection-banner demo';
    if (statusText) statusText.innerHTML = '<i class="fa-solid fa-database"></i> Mode Demo (Local Storage)';
    
    // Settings panel adjust
    if (connectedDiv) connectedDiv.style.display = 'none';
    if (disconnectedDiv) disconnectedDiv.style.display = 'block';

    const textarea = document.getElementById('set-firebase-json');
    if (textarea && !textarea.value.trim() && window.FirebaseDB && window.FirebaseDB.config) {
      textarea.value = JSON.stringify(window.FirebaseDB.config, null, 2);
    }
  }
}

// Role and Access Control Sidebar Badge
function updateSidebarUserBadge() {
  const avatar = document.getElementById('sidebar-user-avatar');
  const name = document.getElementById('sidebar-user-name');
  const role = document.getElementById('sidebar-user-role');

  if (avatar && state.currentUser) avatar.textContent = state.currentUser.name.charAt(0);
  if (name && state.currentUser) name.textContent = state.currentUser.name;
  if (role && state.currentUser) role.textContent = state.currentUser.role;
}

// Check if shift is active, overlay locking POS if not
function checkActiveShiftState() {
  const dot = document.getElementById('sidebar-shift-dot');
  const text = document.getElementById('sidebar-shift-text');
  const actionBtn = document.getElementById('sidebar-shift-action-btn');

  if (state.activeShift) {
    if (dot) dot.className = 'status-dot active';
    if (text) text.textContent = `Shift: Open (${state.activeShift.cashierName})`;
    if (actionBtn) actionBtn.style.display = 'block';
  } else {
    if (dot) dot.className = 'status-dot inactive';
    if (text) text.textContent = 'Shift Belum Dibuka';
    if (actionBtn) actionBtn.style.display = 'none';
    
    // Redirect to Shift tab on POS load to prompt opening shift
    if (state.activeTab === 'kasir') {
      switchTab('shift');
    }
  }
}

// SPA Routing switcher
function switchTab(tabId) {
  // Access control check: Only Admin can see Reports (Laporan) & Settings (Pengaturan)
  if (state.currentUser && state.currentUser.role !== 'Admin' && (tabId === 'laporan' || tabId === 'pengaturan')) {
    showToast('Akses Ditolak! Hanya administrator yang dapat membuka menu ini.', 'error');
    return;
  }

  // Active state change navbar links
  document.querySelectorAll('nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });
  const activeLink = document.querySelector(`nav .nav-link[data-tab="${tabId}"]`);
  if (activeLink) activeLink.classList.add('active');

  // Active state change panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  const targetPanel = document.getElementById(`panel-${tabId}`);
  if (targetPanel) targetPanel.classList.add('active');
  
  state.activeTab = tabId;

  // Header Title Adjust
  const headers = {
    kasir: { title: 'Transaksi Kasir', icon: 'fa-cash-register' },
    inventaris: { title: 'Manajemen Inventaris & Stok', icon: 'fa-box' },
    pelanggan: { title: 'CRM & Pelanggan Tetap', icon: 'fa-users' },
    laporan: { title: 'Laporan Penjualan & Analitik', icon: 'fa-chart-line' },
    shift: { title: 'Laci Shift Kasir & Pengguna', icon: 'fa-user-clock' },
    pengaturan: { title: 'Pengaturan Sistem POS', icon: 'fa-sliders' }
  };
  
  const info = headers[tabId] || { title: 'Dashboard', icon: 'fa-desktop' };
  const pageTitle = document.getElementById('page-header-title');
  if (pageTitle) pageTitle.innerHTML = `<i class="fa-solid ${info.icon}"></i> ${info.title}`;

  // Execute panel callbacks
  if (tabId === 'kasir') {
    renderCatalogGrid();
    const searchInput = document.getElementById('kasir-search-input');
    if (searchInput) searchInput.focus();
  } else if (tabId === 'inventaris') {
    renderInventoryTable();
  } else if (tabId === 'pelanggan') {
    renderCustomerTable();
  } else if (tabId === 'laporan') {
    renderLaporanDashboard();
  } else if (tabId === 'shift') {
    renderShiftTabDetails();
  }
}

// ================= PANEL 1: KASIR ENGINE =================

let activeCategory = 'Semua';

// Render top quick category filters
function renderCategoryPills() {
  const container = document.getElementById('kasir-category-chips');
  if (!container) return;

  const categories = ['Semua', 'Makanan', 'Minuman', 'Cemilan', 'Lainnya'];
  
  container.innerHTML = categories.map(cat => `
    <button class="category-chip ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">
      ${cat}
    </button>
  `).join('');
  
  // Event delegation
  container.querySelectorAll('.category-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      activeCategory = e.currentTarget.getAttribute('data-cat');
      renderCategoryPills();
      renderCatalogGrid();
    });
  });
}

// Render Products catalog grid based on category & search string
function renderCatalogGrid() {
  const grid = document.getElementById('kasir-product-grid');
  if (!grid) return;

  const searchInput = document.getElementById('kasir-search-input');
  const searchStr = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  // Filter products
  let filtered = state.products;
  
  // Category Filter
  if (activeCategory !== 'Semua') {
    filtered = filtered.filter(p => p.category === activeCategory);
  }
  
  // Search Filter (SKU or Name match)
  if (searchStr) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchStr) || p.sku.includes(searchStr));
  }
  
  if (filtered.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <i class="fa-solid fa-box-open" style="font-size: 32px; margin-bottom: 12px; opacity: 0.3;"></i>
        <p>Produk tidak ditemukan</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = filtered.map(p => {
    let stockClass = 'in-stock';
    let stockText = `Stok: ${p.stock}`;
    let disabledClass = '';
    
    if (p.stock === 0) {
      stockClass = 'out-of-stock';
      stockText = 'Stok Habis';
      disabledClass = 'disabled';
    } else if (p.stock < 5) {
      stockClass = 'low-stock';
      stockText = `Stok Kritis: ${p.stock}`;
    }
    
    return `
      <div class="product-card ${disabledClass}" data-id="${p.id}">
        <span class="product-category-tag">${p.category}</span>
        <h4 class="product-card-title">${p.name}</h4>
        <span class="product-card-sku">${p.sku}</span>
        <div class="product-card-footer">
          <span class="product-card-price">${formatRupiah(p.sellPrice)}</span>
          <span class="stock-badge ${stockClass}">${stockText}</span>
        </div>
      </div>
    `;
  }).join('');
  
  // Click listener
  grid.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      const prod = state.products.find(p => p.id === id);
      if (prod && prod.stock > 0) {
        addToCart(prod);
      } else if (prod && prod.stock <= 0) {
        showToast('Stok barang habis!', 'warning');
      }
    });
  });
}

// Add item to active cart array
function addToCart(product) {
  // Check if shift is active
  if (!state.activeShift) {
    showToast('Shift kasir belum dibuka! Silakan buka shift terlebih dahulu di menu "Shift & Pengguna".', 'warning');
    switchTab('shift');
    return;
  }

  const existing = state.cart.find(item => item.productId === product.id);
  if (existing) {
    if (existing.qty >= product.stock) {
      showToast(`Stok tidak mencukupi! Batas stok saat ini ${product.stock} item.`, 'warning');
      return;
    }
    existing.qty++;
    existing.subtotal = existing.qty * existing.sellPrice;
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      qty: 1,
      sellPrice: product.sellPrice,
      buyPrice: product.buyPrice,
      subtotal: product.sellPrice
    });
  }
  renderCart();
}

// Adjust quantity inside cart
function updateCartQty(productId, delta) {
  const index = state.cart.findIndex(item => item.productId === productId);
  if (index === -1) return;
  
  const product = state.products.find(p => p.id === productId);
  const cartItem = state.cart[index];
  
  const newQty = cartItem.qty + delta;
  
  if (newQty <= 0) {
    state.cart.splice(index, 1);
  } else {
    if (newQty > product.stock) {
      showToast(`Stok tidak mencukupi! Batas stok ${product.stock} item.`, 'warning');
      return;
    }
    cartItem.qty = newQty;
    cartItem.subtotal = cartItem.qty * cartItem.sellPrice;
  }
  renderCart();
}

// Render shopping cart panel
function renderCart() {
  const list = document.getElementById('kasir-cart-list');
  if (!list) return;

  if (state.cart.length === 0) {
    list.innerHTML = `
      <div class="cart-empty-state">
        <i class="fa-solid fa-basket-shopping"></i>
        <span>Keranjang Belanja Kosong</span>
      </div>
    `;
    updateCartTotals(0, 0, 0, 0);
    return;
  }
  
  list.innerHTML = state.cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">${formatRupiah(item.sellPrice)}</div>
      </div>
      
      <div class="cart-item-controls">
        <button class="qty-btn" onclick="window.App.updateCartQty('${item.productId}', -1)">-</button>
        <span class="qty-val">${item.qty}</span>
        <button class="qty-btn" onclick="window.App.updateCartQty('${item.productId}', 1)">+</button>
      </div>
      
      <div class="cart-item-subtotal">${formatRupiah(item.subtotal)}</div>
      <i class="fa-solid fa-circle-xmark cart-item-remove" onclick="window.App.updateCartQty('${item.productId}', -${item.qty})"></i>
    </div>
  `).join('');
  
  recalculateCartMath();
}

// Recalculate Subtotal, Discounts, PPN, and final bill amount
function recalculateCartMath() {
  const discountInput = document.getElementById('cart-discount-input');
  const taxInput = document.getElementById('cart-tax-input');
  if (!discountInput || !taxInput) return;

  const subtotal = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calculate discount
  const discStr = discountInput.value.trim();
  let discountVal = 0;
  if (discStr) {
    if (discStr.endsWith('%')) {
      const percentage = parseFloat(discStr.replace('%', '')) || 0;
      discountVal = Math.round(subtotal * (percentage / 100));
    } else {
      discountVal = parseFloat(discStr) || 0;
    }
  }
  discountVal = Math.min(subtotal, Math.max(0, discountVal)); // bounds checkout discount

  // Tax percentage PPN (default 11)
  const taxPct = parseFloat(taxInput.value) || 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxVal = Math.round(taxableAmount * (taxPct / 100));
  
  const grandTotal = taxableAmount + taxVal;
  updateCartTotals(subtotal, discountVal, taxVal, grandTotal);
}

function updateCartTotals(subtotal, discount, tax, grandTotal) {
  const subtotalEl = document.getElementById('cart-subtotal-val');
  const discountEl = document.getElementById('cart-discount-val');
  const taxEl = document.getElementById('cart-tax-val');
  const totalEl = document.getElementById('cart-total-val');

  if (subtotalEl) subtotalEl.textContent = formatRupiah(subtotal);
  if (discountEl) discountEl.textContent = '-' + formatRupiah(discount);
  if (taxEl) taxEl.textContent = formatRupiah(tax);
  if (totalEl) totalEl.textContent = formatRupiah(grandTotal);
}

// Populate customer loyalty CRM drop down selection
function populateCustomerDropdowns() {
  const select = document.getElementById('cart-customer-select');
  if (!select) return;

  const currentValue = select.value;
  
  select.innerHTML = `
    <option value="">-- Pilih Pelanggan (Umum) --</option>
    ${state.customers.map(c => `<option value="${c.id}">${c.name} (${c.phone}) - Poin: ${c.points}</option>`).join('')}
  `;
  
  // Keep selection if exists
  if (state.customers.some(c => c.id === currentValue)) {
    select.value = currentValue;
  }
}

// ================= TRANS-CHECKOUT DRAWERS =================

let activePaymentMethod = 'Tunai';

function initCheckoutModal() {
  if (state.cart.length === 0) {
    showToast('Keranjang belanja kosong!', 'warning');
    return;
  }
  
  const subtotal = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountInput = document.getElementById('cart-discount-input');
  const discStr = discountInput ? discountInput.value.trim() : '0';
  let discountVal = 0;
  if (discStr) {
    if (discStr.endsWith('%')) {
      discountVal = Math.round(subtotal * (parseFloat(discStr.replace('%', '')) / 100));
    } else {
      discountVal = parseFloat(discStr) || 0;
    }
  }
  discountVal = Math.min(subtotal, Math.max(0, discountVal));
  const taxInput = document.getElementById('cart-tax-input');
  const taxPct = taxInput ? parseFloat(taxInput.value) || 0 : 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxVal = Math.round(taxableAmount * (taxPct / 100));
  const total = taxableAmount + taxVal;
  
  // Set modal total display
  const totalBillEl = document.getElementById('checkout-total-bill');
  const cashReceivedInput = document.getElementById('checkout-cash-received');
  const changeAmountEl = document.getElementById('checkout-change-amount');

  if (totalBillEl) totalBillEl.textContent = formatRupiah(total);
  if (cashReceivedInput) cashReceivedInput.value = '';
  if (changeAmountEl) changeAmountEl.textContent = 'Rp 0';
  
  // Generate quick cash buttons based on invoice amount
  generateQuickCashButtons(total);
  
  // Set default method
  setCheckoutPaymentMethod('Tunai');
  
  openModal('modal-checkout');
  
  // Focus cash input if Tunai
  setTimeout(() => {
    const cashInput = document.getElementById('checkout-cash-received');
    if (cashInput && activePaymentMethod === 'Tunai') cashInput.focus();
  }, 150);
}

// Set active payment selection and display respective sub-form panels
function setCheckoutPaymentMethod(method) {
  activePaymentMethod = method;
  
  // Toggle Active CSS buttons
  document.querySelectorAll('.payment-method-card-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-method') === method) btn.classList.add('active');
  });
  
  // Toggle sub-panels UI
  const cashPanel = document.getElementById('checkout-cash-received'); // check parent form panels
  const cashPanelDiv = document.getElementById('checkout-cash-panel');
  const qrisPanel = document.getElementById('checkout-qris-panel');
  const cardPanel = document.getElementById('checkout-card-panel');
  const changePanel = document.getElementById('checkout-change-panel');
  const submitBtn = document.getElementById('checkout-submit-btn');

  // Cancel any QRIS simulated scan triggers
  if (state.qrisTimer) {
    clearTimeout(state.qrisTimer);
    state.qrisTimer = null;
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-print"></i> PROSES BAYAR';
  }

  if (method === 'Tunai') {
    if (cashPanelDiv) cashPanelDiv.style.display = 'block';
    if (qrisPanel) qrisPanel.style.display = 'none';
    if (cardPanel) cardPanel.style.display = 'none';
    if (changePanel) changePanel.style.display = 'flex';
    if (cashPanel) cashPanel.focus();
    validateCashReceived();
  } else if (method === 'Debit/Kredit') {
    if (cashPanelDiv) cashPanelDiv.style.display = 'none';
    if (qrisPanel) qrisPanel.style.display = 'none';
    if (cardPanel) cardPanel.style.display = 'block';
    if (changePanel) changePanel.style.display = 'none';
  } else if (method === 'QRIS/E-Wallet') {
    if (cashPanelDiv) cashPanelDiv.style.display = 'none';
    if (qrisPanel) qrisPanel.style.display = 'flex';
    if (cardPanel) cardPanel.style.display = 'none';
    if (changePanel) changePanel.style.display = 'none';
    
    // Simulate automated payment after 4 seconds
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menunggu Scan...';
    }
    
    state.qrisTimer = setTimeout(() => {
      showToast('QRIS Berhasil Di-scan! Pembayaran Diterima.', 'success');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Pembayaran Berhasil';
      }
      
      // Auto complete checkout after short notification pause
      setTimeout(() => {
        processPOSCheckout();
      }, 800);
    }, 4000);
  }
}

// Generate round quick cash keys
function generateQuickCashButtons(totalBill) {
  const container = document.getElementById('checkout-quick-cash');
  if (!container) return;
  
  // Standard bill options
  const cashOptions = [totalBill];
  
  // Find typical denominations larger than total
  const denoms = [10000, 20000, 50000, 100000];
  denoms.forEach(d => {
    if (d > totalBill) cashOptions.push(d);
  });
  
  // Custom double rounds e.g. Rp 150.000 for Rp 120.000 bill
  const roundHigher = Math.ceil(totalBill / 50000) * 50000;
  if (!cashOptions.includes(roundHigher)) cashOptions.push(roundHigher);
  
  const roundTenHigher = Math.ceil(totalBill / 10000) * 10000;
  if (!cashOptions.includes(roundTenHigher)) cashOptions.push(roundTenHigher);
  
  // Unique sorted options
  const uniqueOptions = [...new Set(cashOptions)].sort((a,b)=>a-b).slice(0, 6);
  
  container.innerHTML = `
    <button class="quick-cash-chip" data-val="${totalBill}">Uang Pas</button>
    ` + uniqueOptions.filter(v => v !== totalBill).map(val => `
      <button class="quick-cash-chip" data-val="${val}">${formatRupiah(val)}</button>
    `).join('');
    
  container.querySelectorAll('.quick-cash-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const val = parseFloat(e.currentTarget.getAttribute('data-val'));
      const cashInput = document.getElementById('checkout-cash-received');
      if (cashInput) cashInput.value = val;
      validateCashReceived();
    });
  });
}

// Calculate and show return change amounts in real-time
function validateCashReceived() {
  const input = document.getElementById('checkout-cash-received');
  const submitBtn = document.getElementById('checkout-submit-btn');
  const changeValEl = document.getElementById('checkout-change-amount');
  
  if (!input || !changeValEl || !submitBtn) return;

  const subtotal = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountInput = document.getElementById('cart-discount-input');
  const discStr = discountInput ? discountInput.value.trim() : '0';
  let discountVal = 0;
  if (discStr) {
    if (discStr.endsWith('%')) {
      discountVal = Math.round(subtotal * (parseFloat(discStr.replace('%', '')) / 100));
    } else {
      discountVal = parseFloat(discStr) || 0;
    }
  }
  discountVal = Math.min(subtotal, Math.max(0, discountVal));
  const taxInput = document.getElementById('cart-tax-input');
  const taxPct = taxInput ? parseFloat(taxInput.value) || 0 : 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxVal = Math.round(taxableAmount * (taxPct / 100));
  const total = taxableAmount + taxVal;
  
  const cashReceived = parseFloat(input.value) || 0;
  const change = cashReceived - total;
  
  if (change >= 0) {
    changeValEl.textContent = formatRupiah(change);
    submitBtn.disabled = false;
  } else {
    changeValEl.textContent = 'Kurang ' + formatRupiah(Math.abs(change));
    submitBtn.disabled = true;
  }
}

// Execute POS cart transaction checkout
async function processPOSCheckout() {
  if (!state.activeShift) {
    showToast('Shift tidak aktif!', 'error');
    return;
  }
  
  const subtotal = state.cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountInput = document.getElementById('cart-discount-input');
  const discStr = discountInput ? discountInput.value.trim() : '0';
  let discountVal = 0;
  if (discStr) {
    if (discStr.endsWith('%')) {
      discountVal = Math.round(subtotal * (parseFloat(discStr.replace('%', '')) / 100));
    } else {
      discountVal = parseFloat(discStr) || 0;
    }
  }
  discountVal = Math.min(subtotal, Math.max(0, discountVal));
  const taxInput = document.getElementById('cart-tax-input');
  const taxPct = taxInput ? parseFloat(taxInput.value) || 0 : 0;
  const taxableAmount = Math.max(0, subtotal - discountVal);
  const taxVal = Math.round(taxableAmount * (taxPct / 100));
  const total = taxableAmount + taxVal;
  const totalCost = state.cart.reduce((sum, item) => sum + (item.buyPrice * item.qty), 0);
  
  let cashReceived = total;
  if (activePaymentMethod === 'Tunai') {
    const cashInput = document.getElementById('checkout-cash-received');
    cashReceived = cashInput ? parseFloat(cashInput.value) || total : total;
  }
  const cashChange = cashReceived - total;

  const customerSelect = document.getElementById('cart-customer-select');
  const customerId = customerSelect ? customerSelect.value : '';
  const customerObj = state.customers.find(c => c.id === customerId);

  const txId = "tx-" + Math.random().toString(36).substr(2, 9);
  
  const transaction = {
    id: txId,
    timestamp: new Date().toISOString(),
    items: [...state.cart],
    subtotal,
    discount: discountVal,
    tax: taxVal,
    total,
    totalCost,
    paymentMethod: activePaymentMethod,
    customerId,
    customerName: customerObj ? customerObj.name : 'Umum',
    cashierName: state.currentUser.name,
    shiftId: state.activeShift.id,
    cashReceived,
    cashChange
  };

  try {
    // Save to Database (this automatically deducts stock and awards CRM points)
    await DB.saveTransaction(transaction);
    
    // Auto add points to local state for rendering
    if (customerId && total >= 10000) {
      const pointsAdded = Math.floor(total / 10000);
      const custIndex = state.customers.findIndex(c => c.id === customerId);
      if (custIndex !== -1) {
        state.customers[custIndex].points += pointsAdded;
      }
    }

    // Trigger printed invoice layout to thermal printer
    triggerThermalPrint(transaction);

    // Update active Shift values
    await updateActiveShiftFinances(transaction);

    // Clear cart and clean inputs
    state.cart = [];
    if (discountInput) discountInput.value = '0';
    if (customerSelect) customerSelect.value = '';
    
    // Refresh local lists
    renderCatalogGrid();
    renderCart();
    populateCustomerDropdowns();
    
    closeModal('modal-checkout');
    showToast(`Transaksi ${txId} berhasil diselesaikan!`, 'success');
  } catch (err) {
    console.error("Gagal memproses checkout transaksi POS:", err);
    showToast('Gagal memproses transaksi. Periksa database.', 'error');
  }
}

// Update Active Shift cash metrics on transaction commit
async function updateActiveShiftFinances(transaction) {
  if (!state.activeShift) return;
  
  const activeShift = { ...state.activeShift };
  
  if (transaction.paymentMethod === 'Tunai') {
    activeShift.cashSales = (activeShift.cashSales || 0) + transaction.total;
  } else {
    activeShift.nonCashSales = (activeShift.nonCashSales || 0) + transaction.total;
  }
  
  await DB.saveShift(activeShift);
  state.activeShift = activeShift;
}

// Generate receipt print template & call browser printing service via Iframe
function triggerThermalPrint(tx) {
  const holder = document.getElementById('print-iframe-holder');
  if (!holder) return;

  holder.innerHTML = '';
  
  const iframe = document.createElement('iframe');
  iframe.style.width = '0px';
  iframe.style.height = '0px';
  iframe.style.border = 'none';
  holder.appendChild(iframe);
  
  const doc = iframe.contentWindow.document;
  
  const receiptItemsHtml = tx.items.map(item => `
    <div class="receipt-item-row">
      <div class="receipt-item-name">${item.name}</div>
      <div class="receipt-item-details">
        <span>${item.qty} x ${formatRupiah(item.sellPrice)}</span>
        <span>${formatRupiah(item.subtotal)}</span>
      </div>
    </div>
  `).join('');

  const docContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Receipt</title>
      <style>
        body { margin: 0; padding: 0; font-family: monospace; font-size: 11px; }
        #receipt-print-area { width: 58mm; padding: 2mm; box-sizing: border-box; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .row { display: flex; justify-content: space-between; }
        .item-name { word-break: break-all; }
        .item-details { display: flex; justify-content: space-between; padding-left: 6px; font-size: 10px; }
        .totals { margin-top: 6px; }
        .grand { font-size: 12px; font-weight: bold; }
        .footer { text-align: center; margin-top: 10px; font-size: 9px; }
      </style>
    </head>
    <body>
      <div id="receipt-print-area">
        <div class="center">
          <div class="bold" style="font-size: 14px; text-transform: uppercase;">${state.storeProfile.name}</div>
          <div style="font-size: 9px; margin-top: 2px;">${state.storeProfile.address}</div>
          <div style="font-size: 9px;">Telp: ${state.storeProfile.phone}</div>
        </div>
        
        <div class="divider"></div>
        
        <div style="font-size: 9px;">
          <div class="row"><span>ID: ${tx.id}</span></div>
          <div class="row"><span>Tgl: ${new Date(tx.timestamp).toLocaleString('id-ID')}</span></div>
          <div class="row"><span>Kasir: ${tx.cashierName}</span></div>
          <div class="row"><span>Pelanggan: ${tx.customerName}</span></div>
        </div>
        
        <div class="divider"></div>
        
        <div>${receiptItemsHtml}</div>
        
        <div class="divider"></div>
        
        <div class="totals">
          <div class="row"><span>Subtotal:</span><span>${formatRupiah(tx.subtotal)}</span></div>
          ${tx.discount > 0 ? `<div class="row"><span>Diskon:</span><span>-${formatRupiah(tx.discount)}</span></div>` : ''}
          <div class="row"><span>PPN (11%):</span><span>${formatRupiah(tx.tax)}</span></div>
          <div class="row grand"><span>TOTAL:</span><span>${formatRupiah(tx.total)}</span></div>
          <div class="divider"></div>
          <div class="row"><span>Metode:</span><span>${tx.paymentMethod}</span></div>
          ${tx.paymentMethod === 'Tunai' ? `
            <div class="row"><span>Bayar:</span><span>${formatRupiah(tx.cashReceived)}</span></div>
            <div class="row"><span>Kembali:</span><span>${formatRupiah(tx.cashChange)}</span></div>
          ` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="footer">
          ${state.storeProfile.footer}
          <br>POWERED BY AEROPOS
        </div>
      </div>
    </body>
    </html>
  `;
  
  doc.open();
  doc.write(docContent);
  doc.close();
  
  // Timeout for DOM print paint trigger
  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  }, 350);
}

// Reprint a past receipt from reports table list
function reprintTransaction(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (tx) {
    triggerThermalPrint(tx);
    showToast(`Struk ${txId} berhasil dicetak ulang!`, 'success');
  } else {
    showToast('Transaksi tidak ditemukan!', 'error');
  }
}

// ================= PANEL 2: INVENTARIS ENGINE =================

function renderInventoryTable() {
  const searchInput = document.getElementById('inventory-search-input');
  const tbody = document.getElementById('inventory-table-body');
  if (!tbody) return;

  const searchStr = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  let filtered = state.products;
  if (searchStr) {
    filtered = filtered.filter(p => p.name.toLowerCase().includes(searchStr) || p.sku.includes(searchStr) || p.category.toLowerCase().includes(searchStr));
  }

  // Count low stock items & show alerting warning banner
  const lowStockProducts = state.products.filter(p => p.stock < 5);
  const banner = document.getElementById('inventory-low-stock-banner');
  const bannerText = document.getElementById('inventory-low-stock-text');
  
  if (banner) {
    if (lowStockProducts.length > 0) {
      banner.style.display = 'flex';
      if (bannerText) bannerText.textContent = `Peringatan! Terdapat ${lowStockProducts.length} produk yang memiliki stok kritis di bawah 5 item. Segera lakukan restock.`;
    } else {
      banner.style.display = 'none';
    }
  }

  if (filtered.length === 0) {
    const isKasir = (state.currentUser && state.currentUser.role === 'Kasir');
    const cols = isKasir ? 5 : 7;
    tbody.innerHTML = `
      <tr>
        <td colspan="${cols}" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Tidak ada data produk
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(p => {
    let stockStyle = 'color: var(--success); font-weight: 700;';
    if (p.stock === 0) {
      stockStyle = 'color: var(--danger); font-weight: 800; text-decoration: line-through;';
    } else if (p.stock < 5) {
      stockStyle = 'color: var(--warning); font-weight: 700; animation: pulse 2s infinite;';
    }

    const isKasir = (state.currentUser && state.currentUser.role === 'Kasir');
    
    if (isKasir) {
      return `
        <tr>
          <td style="font-family: monospace; font-weight: 700;">${p.sku}</td>
          <td style="font-weight: 600; color: var(--text-main);">${p.name}</td>
          <td><span class="badge-role admin" style="background: rgba(99,102,241,0.08);">${p.category}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatRupiah(p.sellPrice)}</td>
          <td style="text-align: center; font-family: monospace; ${stockStyle}">${p.stock}</td>
        </tr>
      `;
    } else {
      return `
        <tr>
          <td style="font-family: monospace; font-weight: 700;">${p.sku}</td>
          <td style="font-weight: 600; color: var(--text-main);">${p.name}</td>
          <td><span class="badge-role admin" style="background: rgba(99,102,241,0.08);">${p.category}</span></td>
          <td style="text-align: right; font-family: monospace;">${formatRupiah(p.buyPrice)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700;">${formatRupiah(p.sellPrice)}</td>
          <td style="text-align: center; font-family: monospace; ${stockStyle}">${p.stock}</td>
          <td style="text-align: center;">
            <div class="action-buttons-cell" style="justify-content: center;">
              <button class="btn-icon-action" onclick="window.App.editProductItem('${p.id}')" title="Edit Item"><i class="fa-solid fa-pencil"></i></button>
              <button class="btn-icon-action delete" onclick="window.App.deleteProductItem('${p.id}')" title="Hapus Item"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    }
  }).join('');
}

// Edit product click handler
function editProductItem(productId) {
  const prod = state.products.find(p => p.id === productId);
  if (!prod) return;
  
  const titleEl = document.getElementById('modal-product-title');
  const idEl = document.getElementById('prod-id');
  const skuEl = document.getElementById('prod-sku');
  const nameEl = document.getElementById('prod-name');
  const catEl = document.getElementById('prod-category');
  const stockEl = document.getElementById('prod-stock');
  const buyEl = document.getElementById('prod-buy-price');
  const sellEl = document.getElementById('prod-sell-price');

  if (titleEl) titleEl.textContent = 'Ubah Produk';
  if (idEl) idEl.value = prod.id;
  if (skuEl) skuEl.value = prod.sku;
  if (nameEl) nameEl.value = prod.name;
  if (catEl) catEl.value = prod.category;
  if (stockEl) stockEl.value = prod.stock;
  if (buyEl) buyEl.value = prod.buyPrice;
  if (sellEl) sellEl.value = prod.sellPrice;
  
  openModal('modal-product');
}

// Delete product handler
async function deleteProductItem(productId) {
  if (confirm("Apakah Anda yakin ingin menghapus produk ini? Tindakan ini tidak dapat dibatalkan.")) {
    try {
      await DB.deleteProduct(productId);
      renderInventoryTable();
      showToast('Produk berhasil dihapus!', 'success');
    } catch (e) {
      showToast('Gagal menghapus produk.', 'error');
    }
  }
}

// ================= PANEL 3: CRM ENGINE =================

function renderCustomerTable() {
  const searchInput = document.getElementById('customer-search-input');
  const tbody = document.getElementById('customer-table-body');
  if (!tbody) return;

  const searchStr = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  let filtered = state.customers;
  if (searchStr) {
    filtered = filtered.filter(c => c.name.toLowerCase().includes(searchStr) || c.phone.includes(searchStr));
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Tidak ada data pelanggan
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(c => `
    <tr>
      <td style="font-weight: 600; color: var(--text-main);">${c.name}</td>
      <td style="font-family: monospace;">${c.phone}</td>
      <td style="text-align: center; font-weight: 700; color: var(--success); font-family: monospace;">${c.points}</td>
      <td style="text-align: center;">
        <div class="action-buttons-cell" style="justify-content: center;">
          <button class="btn-icon-action" onclick="window.App.editCustomerItem('${c.id}')" title="Edit Pelanggan"><i class="fa-solid fa-pencil"></i></button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Edit CRM Customer profile
function editCustomerItem(customerId) {
  const customer = state.customers.find(c => c.id === customerId);
  if (!customer) return;
  
  const titleEl = document.getElementById('modal-customer-title');
  const idEl = document.getElementById('cust-id');
  const nameEl = document.getElementById('cust-name');
  const phoneEl = document.getElementById('cust-phone');

  if (titleEl) titleEl.textContent = 'Ubah Data Pelanggan';
  if (idEl) idEl.value = customer.id;
  if (nameEl) nameEl.value = customer.name;
  if (phoneEl) phoneEl.value = customer.phone;
  
  openModal('modal-customer');
}

// ================= PANEL 4: REPORTS ENGINE =================

// Report Printing Feature
function printReport(optSummary, optHistory, optChart) {
  let reportHtml = `
    <html>
    <head>
      <title>Laporan Kasir - ${state.storeProfile.name}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #333; }
        h1, h2 { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; }
        .summary-box { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; border: 1px solid #eee; background: #f9fafb; }
        .summary-item { text-align: center; }
        .summary-val { font-size: 18px; font-weight: bold; margin-top: 5px; color: #111; }
        @media print {
          @page { margin: 1cm; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${state.storeProfile.name}</h1>
      <p style="text-align: center;">Tanggal Cetak: ${new Date().toLocaleString('id-ID')}</p>
      <hr style="margin-bottom: 20px;">
  `;

  if (optSummary) {
    const allTxCount = state.transactions.length;
    const allRevenue = state.transactions.reduce((sum, t) => sum + t.total, 0);
    const allCost = state.transactions.reduce((sum, t) => sum + (t.totalCost || 0), 0);
    const allProfit = Math.max(0, allRevenue - allCost);
    
    reportHtml += `
      <h2>Ringkasan Penjualan Keseluruhan</h2>
      <div class="summary-box">
        <div class="summary-item"><div>Total Transaksi</div><div class="summary-val">${allTxCount}</div></div>
        <div class="summary-item"><div>Total Pendapatan</div><div class="summary-val">${formatRupiah(allRevenue)}</div></div>
        <div class="summary-item"><div>Laba Kotor</div><div class="summary-val">${formatRupiah(allProfit)}</div></div>
      </div>
    `;
  }

  if (optChart) {
    const chartCanvas = document.getElementById('chart-sales');
    let chartImgHtml = '';
    if (chartCanvas) {
      try {
        const imgData = chartCanvas.toDataURL('image/png');
        chartImgHtml = `<img src="${imgData}" style="max-width: 100%; height: auto; margin-bottom: 20px;">`;
      } catch (e) {
        chartImgHtml = `<p><em>Grafik tidak dapat dimuat.</em></p>`;
      }
    }
    reportHtml += `
      <h2>Grafik Analitik</h2>
      ${chartImgHtml}
    `;
  }

  if (optHistory) {
    reportHtml += `
      <h2>Riwayat Transaksi (50 Terakhir)</h2>
      <table>
        <thead>
          <tr>
            <th>ID Struk</th>
            <th>Tanggal/Waktu</th>
            <th>Kasir</th>
            <th>Pelanggan</th>
            <th>Metode</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
    `;
    const txList = state.transactions.slice(0, 50);
    if (txList.length === 0) {
      reportHtml += `<tr><td colspan="6" style="text-align: center;">Tidak ada transaksi</td></tr>`;
    } else {
      txList.forEach(t => {
        reportHtml += `
          <tr>
            <td>${t.id}</td>
            <td>${new Date(t.timestamp).toLocaleString('id-ID')}</td>
            <td>${t.cashierName}</td>
            <td>${t.customerName}</td>
            <td>${t.paymentMethod}</td>
            <td style="text-align: right;">${formatRupiah(t.total)}</td>
          </tr>
        `;
      });
    }
    reportHtml += `
        </tbody>
      </table>
    `;
  }

  reportHtml += `
      <div style="margin-top: 30px; text-align: center;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #4f46e5; color: white; border: none; cursor: pointer; border-radius: 4px;">Cetak Laporan</button>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Process calculations and populate metric widgets and visual Chart.js canvases
function renderLaporanDashboard() {
  const txCountEl = document.getElementById('report-tx-count');
  const revEl = document.getElementById('report-revenue-val');
  const profEl = document.getElementById('report-profit-val');
  const lowStockEl = document.getElementById('report-low-stock-count');
  const tbody = document.getElementById('report-table-body');
  if (!tbody) return;

  const dateFilterInput = document.getElementById('report-date-filter');
  const dateFilter = dateFilterInput ? dateFilterInput.value : '';

  let filteredTransactions = state.transactions;
  if (dateFilter) {
    filteredTransactions = state.transactions.filter(t => {
      const txDate = new Date(t.timestamp).toISOString().split('T')[0];
      return txDate === dateFilter;
    });
  }

  // 1. Calculations
  const allTxCount = state.transactions.length;
  const allRevenue = state.transactions.reduce((sum, t) => sum + t.total, 0);
  const allCost = state.transactions.reduce((sum, t) => sum + (t.totalCost || 0), 0);
  const allProfit = Math.max(0, allRevenue - allCost);
  const criticalItemsCount = state.products.filter(p => p.stock < 5).length;

  if (txCountEl) txCountEl.textContent = allTxCount;
  if (revEl) revEl.textContent = formatRupiah(allRevenue);
  if (profEl) profEl.textContent = formatRupiah(allProfit);
  if (lowStockEl) lowStockEl.textContent = criticalItemsCount;

  // Filter Metrics
  const txCount = filteredTransactions.length;
  const revenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  const avg = txCount > 0 ? revenue / txCount : 0;

  const filterTxCountEl = document.getElementById('filter-tx-count');
  const filterTxRevenueEl = document.getElementById('filter-tx-revenue');
  const filterTxAvgEl = document.getElementById('filter-tx-avg');
  
  if (filterTxCountEl) filterTxCountEl.textContent = txCount;
  if (filterTxRevenueEl) filterTxRevenueEl.textContent = formatRupiah(revenue);
  if (filterTxAvgEl) filterTxAvgEl.textContent = formatRupiah(avg);

  // Pagination Logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(txCount / itemsPerPage) || 1;
  
  if (state.reportCurrentPage > totalPages) state.reportCurrentPage = totalPages;
  if (state.reportCurrentPage < 1) state.reportCurrentPage = 1;

  const startIndex = (state.reportCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, txCount);
  
  const pagInfo = document.getElementById('report-pagination-info');
  const btnPrev = document.getElementById('btn-report-prev');
  const btnNext = document.getElementById('btn-report-next');

  if (pagInfo) {
    pagInfo.textContent = txCount > 0 ? `Menampilkan ${startIndex + 1}-${endIndex} dari ${txCount} transaksi` : `Menampilkan 0 transaksi`;
  }
  if (btnPrev) btnPrev.disabled = state.reportCurrentPage === 1;
  if (btnNext) btnNext.disabled = state.reportCurrentPage === totalPages;

  // 2. Populate History Table
  if (txCount === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">
          Tidak ada catatan transaksi
        </td>
      </tr>
    `;
  } else {
    tbody.innerHTML = filteredTransactions.slice(startIndex, endIndex).map((t, index) => {
      let pmBadge = 'background: rgba(16,185,129,0.08); color: var(--success);';
      if (t.paymentMethod === 'Debit/Kredit') pmBadge = 'background: rgba(99,102,241,0.08); color: var(--primary);';
      if (t.paymentMethod === 'QRIS/E-Wallet') pmBadge = 'background: rgba(245,158,11,0.08); color: var(--warning);';

      return `
        <tr>
          <td>${startIndex + index + 1}</td>
          <td style="font-family: monospace; font-weight: 700;">${t.id}</td>
          <td>${new Date(t.timestamp).toLocaleString('id-ID')}</td>
          <td>${t.cashierName}</td>
          <td style="font-weight: 600;">${t.customerName}</td>
          <td style="text-align: center;"><span class="badge-role" style="${pmBadge} font-size: 10px;">${t.paymentMethod}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: var(--success);">${formatRupiah(t.total)}</td>
          <td style="text-align: center;">
            <button class="btn-icon-action" onclick="window.App.reprintTransaction('${t.id}')" title="Cetak Ulang Struk">
              <i class="fa-solid fa-print"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 3. Render Chart.js
  renderCharts(state.transactions);
}

// Chart.js render engine
function renderCharts(transactions) {
  const salesCanvas = document.getElementById('chart-daily-sales');
  const sellersCanvas = document.getElementById('chart-best-sellers');
  if (!salesCanvas || !sellersCanvas) return;

  // Destroy existing charts to avoid layout overlap errors
  if (state.charts.dailySales) state.charts.dailySales.destroy();
  if (state.charts.bestSellers) state.charts.bestSellers.destroy();

  // Parse Daily Sales (Past 7 Days)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(d.toISOString().split('T')[0]);
  }

  const dailyRevenue = {};
  const dailyProfit = {};
  last7Days.forEach(day => {
    dailyRevenue[day] = 0;
    dailyProfit[day] = 0;
  });

  transactions.forEach(t => {
    const day = t.timestamp.split('T')[0];
    if (dailyRevenue[day] !== undefined) {
      dailyRevenue[day] += t.total;
      const tCost = t.totalCost || 0;
      dailyProfit[day] += Math.max(0, t.total - tCost);
    }
  });

  const ctxLine = salesCanvas.getContext('2d');
  state.charts.dailySales = new Chart(ctxLine, {
    type: 'line',
    data: {
      labels: last7Days.map(d => {
        const parts = d.split('-');
        return `${parts[2]}/${parts[1]}`;
      }),
      datasets: [
        {
          label: 'Omset Penjualan (Revenue)',
          data: last7Days.map(day => dailyRevenue[day]),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        },
        {
          label: 'Laba Bersih Estimasi',
          data: last7Days.map(day => dailyProfit[day]),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2,
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } }
      }
    }
  });

  // Parse Best Selling items (sum qty per item)
  const itemSales = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      itemSales[item.name] = (itemSales[item.name] || 0) + item.qty;
    });
  });

  const bestItems = Object.keys(itemSales)
    .map(name => ({ name, qty: itemSales[name] }))
    .sort((a,b)=> b.qty - a.qty)
    .slice(0, 5);

  const ctxBar = sellersCanvas.getContext('2d');
  state.charts.bestSellers = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: bestItems.map(item => item.name),
      datasets: [{
        label: 'Item Terjual',
        data: bestItems.map(item => item.qty),
        backgroundColor: 'rgba(16, 185, 129, 0.75)',
        borderColor: '#10b981',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
        y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8', stepSize: 1 } }
      }
    }
  });
}

// ================= PANEL 5: SHIFT REGISTER ENGINE =================

function renderShiftTabDetails() {
  const currentActiveSection = document.getElementById('shift-active-details');
  const cashSummarySection = document.getElementById('shift-active-cash-summary');
  const tbody = document.getElementById('shift-table-body');
  const kasirAuthCodeEl = document.getElementById('kasir-auth-code');
  if (!currentActiveSection || !cashSummarySection) return;

  if (kasirAuthCodeEl) {
    kasirAuthCodeEl.textContent = getDailyAuthCode();
  }

  if (state.activeShift) {
    const s = state.activeShift;
    const totalExpected = s.startingCash + s.cashSales;

    currentActiveSection.innerHTML = `
      <div style="font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
        <div><span>Petugas Aktif:</span> <strong style="float: right;">${s.cashierName}</strong></div>
        <div><span>Waktu Buka Shift:</span> <strong style="float: right;">${new Date(s.openedAt).toLocaleString('id-ID')}</strong></div>
        <div><span>Metode Login:</span> <strong style="float: right;">Akun Aktif Sesi</strong></div>
        <button class="btn-sidebar-shift" onclick="window.App.initCloseShiftModal()" style="margin-top: 14px; width: 100%;">
          <i class="fa-solid fa-door-closed"></i> Tutup Shift Sekarang
        </button>
      </div>
    `;

    cashSummarySection.innerHTML = `
      <div class="shift-details-rows">
        <div class="shift-detail-row">
          <span>Modal Kas Awal:</span>
          <strong>${formatRupiah(s.startingCash)}</strong>
        </div>
        <div class="shift-detail-row">
          <span>Penjualan Tunai (+):</span>
          <strong style="color: var(--success);">${formatRupiah(s.cashSales)}</strong>
        </div>
        <div class="shift-detail-row">
          <span>Penjualan Kartu/QRIS:</span>
          <strong>${formatRupiah(s.nonCashSales)}</strong>
        </div>
        <div class="shift-detail-row" style="background: rgba(255, 255, 255, 0.02); padding: 8px; border-radius: 4px; font-weight: bold;">
          <span>Perkiraan Kas Laci:</span>
          <span style="color: var(--primary);">${formatRupiah(totalExpected)}</span>
        </div>
      </div>
    `;
  } else {
    currentActiveSection.innerHTML = `
      <div style="text-align: center; color: var(--text-muted);">
        <i class="fa-solid fa-user-slash" style="font-size: 28px; margin-bottom: 8px; opacity: 0.3;"></i>
        <p>Tidak ada shift aktif</p>
        <button class="btn-primary-action" onclick="window.App.initOpenShiftModal()" style="margin: 14px auto 0 auto; justify-content: center; width: 80%;">
          <i class="fa-solid fa-door-open"></i> Buka Shift Baru
        </button>
      </div>
    `;

    cashSummarySection.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px;">
        <i class="fa-solid fa-lock" style="font-size: 24px; margin-bottom: 8px; opacity: 0.2;"></i>
        <p style="font-size: 12px;">Buka shift terlebih dahulu untuk mulai merekam pencatatan arus laci uang.</p>
      </div>
    `;
  }

  // Populate shift closures history table if exists
  if (tbody) {
    if (state.shifts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">
            Tidak ada rekam histori shift
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = state.shifts.map(s => {
      let diffText = 'Pas';
      let diffStyle = 'color: var(--success); font-weight: 700;';
      
      if (s.drawerDiscrepancy > 0) {
        diffText = '+' + formatRupiah(s.drawerDiscrepancy);
        diffStyle = 'color: var(--warning); font-weight: 700;';
      } else if (s.drawerDiscrepancy < 0) {
        diffText = '-' + formatRupiah(Math.abs(s.drawerDiscrepancy));
        diffStyle = 'color: var(--danger); font-weight: 700;';
      }

      let statusStyle = 'background: rgba(16,185,129,0.1); color: var(--success);';
      if (s.status === 'Aktif') {
        statusStyle = 'background: rgba(99,102,241,0.1); color: var(--primary);';
      }

      return `
        <tr>
          <td style="font-family: monospace;">${s.id}</td>
          <td style="font-weight: 600;">${s.cashierName}</td>
          <td style="font-size: 11px;">${new Date(s.openedAt).toLocaleString('id-ID')}</td>
          <td style="font-size: 11px;">${s.closedAt ? new Date(s.closedAt).toLocaleString('id-ID') : '-'}</td>
          <td style="text-align: right; font-family: monospace;">${formatRupiah(s.startingCash)}</td>
          <td style="text-align: right; font-family: monospace;">${s.closedAt ? formatRupiah(s.actualCash) : '-'}</td>
          <td style="text-align: right; font-family: monospace; ${diffStyle}">${s.closedAt ? diffText : '-'}</td>
          <td><span class="badge-role" style="${statusStyle}">${s.status}</span></td>
          <td style="text-align: center;">
            <button class="btn-icon" title="Koreksi Selisih" onclick="window.App.initEditShiftModal('${s.id}')">
              <i class="fa-solid fa-pen"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }
}

function initOpenShiftModal() {
  openModal('modal-shift-start');
}

function initEditShiftModal(id) {
  const s = state.shifts.find(x => x.id === id);
  if (!s) return;
  document.getElementById('edit-shift-id').value = id;
  document.getElementById('edit-shift-actual-cash').value = s.actualCash || 0;
  document.getElementById('edit-shift-auth-code').value = '';
  openModal('modal-edit-shift');
};

function initCloseShiftModal() {
  if (!state.activeShift) return;
  const s = state.activeShift;
  const expected = s.startingCash + s.cashSales;

  const startCashEl = document.getElementById('shift-end-starting-cash');
  const cashSalesEl = document.getElementById('shift-end-cash-sales');
  const noncashSalesEl = document.getElementById('shift-end-noncash-sales');
  const expectedCashEl = document.getElementById('shift-end-expected-cash');
  const actualCashInput = document.getElementById('shift-actual-cash');
  const notesInput = document.getElementById('shift-notes');

  if (startCashEl) startCashEl.textContent = formatRupiah(s.startingCash);
  if (cashSalesEl) cashSalesEl.textContent = formatRupiah(s.cashSales);
  if (noncashSalesEl) noncashSalesEl.textContent = formatRupiah(s.nonCashSales);
  if (expectedCashEl) expectedCashEl.textContent = formatRupiah(expected);

  if (actualCashInput) actualCashInput.value = '';
  if (notesInput) notesInput.value = '';

  openModal('modal-shift-end');
}

// ================= EVENT LISTENERS & HOTKEYS =================

function setupFormListeners() {
  // 1. Product Form Submit
  bindEvent('form-product', 'submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    
    const product = {
      id: id || null,
      sku: document.getElementById('prod-sku').value.trim(),
      name: document.getElementById('prod-name').value.trim(),
      category: document.getElementById('prod-category').value,
      stock: parseInt(document.getElementById('prod-stock').value) || 0,
      buyPrice: parseFloat(document.getElementById('prod-buy-price').value) || 0,
      sellPrice: parseFloat(document.getElementById('prod-sell-price').value) || 0
    };

    try {
      await DB.saveProduct(product);
      renderInventoryTable();
      closeModal('modal-product');
      showToast('Data produk berhasil disimpan!', 'success');
    } catch (err) {
      showToast('Gagal menyimpan produk.', 'error');
    }
  });

  // 2. Customer Form Submit
  bindEvent('form-customer', 'submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cust-id').value;
    
    const existing = id ? state.customers.find(c => c.id === id) : null;
    const customer = {
      id: id || null,
      name: document.getElementById('cust-name').value.trim(),
      phone: document.getElementById('cust-phone').value.trim(),
      points: existing ? (existing.points || 0) : 0
    };

    try {
      const saved = await DB.saveCustomer(customer);
      
      const crmTable = document.getElementById('customer-table-body');
      if (crmTable) renderCustomerTable();
      
      populateCustomerDropdowns();
      
      // Auto assign if checkout page modal
      const custSelect = document.getElementById('cart-customer-select');
      if (custSelect) {
        custSelect.value = saved.id;
      }
      
      closeModal('modal-customer');
      showToast('Pelanggan berhasil didaftarkan!', 'success');
    } catch (err) {
      showToast('Gagal menyimpan pelanggan.', 'error');
    }
  });

  // 3. Shift Opening Form Submit
  bindEvent('form-shift-start', 'submit', async (e) => {
    e.preventDefault();
    const startingCash = parseFloat(document.getElementById('shift-starting-cash').value) || 0;
    
    const shift = {
      cashierName: state.currentUser.name,
      openedAt: new Date().toISOString(),
      closedAt: null,
      startingCash,
      cashSales: 0,
      nonCashSales: 0,
      actualCash: 0,
      drawerDiscrepancy: 0,
      notes: '',
      status: 'Aktif'
    };

    try {
      const active = await DB.saveShift(shift);
      state.activeShift = active;
      
      checkActiveShiftState();
      closeModal('modal-shift-start');
      showToast('Shift kasir berhasil dibuka!', 'success');
      switchTab('kasir');
    } catch (err) {
      showToast('Gagal membuka shift.', 'error');
    }
  });

  // 4. Shift Closing Form Submit
  bindEvent('form-shift-end', 'submit', async (e) => {
    e.preventDefault();
    if (!state.activeShift) return;
    
    const actualCash = parseFloat(document.getElementById('shift-actual-cash').value) || 0;
    const notes = document.getElementById('shift-notes').value.trim();
    
    const s = state.activeShift;
    const expected = s.startingCash + s.cashSales;
    const discrepancy = actualCash - expected;

    const shiftToClose = {
      ...s,
      closedAt: new Date().toISOString(),
      actualCash,
      drawerDiscrepancy: discrepancy,
      notes,
      status: 'Tutup'
    };

    try {
      await DB.saveShift(shiftToClose);
      state.activeShift = null;
      
      checkActiveShiftState();
      closeModal('modal-shift-end');
      showToast('Shift kasir berhasil ditutup!', 'success');
      switchTab('shift');
    } catch (err) {
      showToast('Gagal menutup shift.', 'error');
    }
  });

  // 5. Store Profile Form Submit
  bindEvent('settings-profile-form', 'submit', (e) => {
    e.preventDefault();
    state.storeProfile = {
      name: document.getElementById('set-store-name').value.trim() || 'AeroPOS Store',
      address: document.getElementById('set-store-address').value.trim() || 'Jakarta',
      phone: document.getElementById('set-store-phone').value.trim() || '081234567890',
      footer: document.getElementById('set-store-footer').value.trim() || 'Terima kasih!',
      logo: state.storeProfile.logo || ''
    };
    
    localStorage.setItem('aeropos_store_profile', JSON.stringify(state.storeProfile));
    updateStoreUI();
    showToast('Profil toko berhasil diperbarui!', 'success');
  });

  // 6. Store Logo Upload
  bindEvent('set-store-logo', 'change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2000000) {
        showToast('Ukuran gambar terlalu besar! Maksimal 2MB.', 'error');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        state.storeProfile.logo = ev.target.result;
        
        // Update Preview Immediately
        const logoPreview = document.getElementById('set-store-logo-preview');
        const logoPlaceholder = document.getElementById('set-store-logo-placeholder');
        const logoRemoveBtn = document.getElementById('set-store-logo-remove');
        if (logoPreview) {
          logoPreview.src = state.storeProfile.logo;
          logoPreview.style.display = 'block';
        }
        if (logoPlaceholder) logoPlaceholder.style.display = 'none';
        if (logoRemoveBtn) logoRemoveBtn.style.display = 'inline-block';
      };
      reader.readAsDataURL(file);
    }
  });

  // 7. Store Logo Remove
  bindEvent('set-store-logo-remove', 'click', () => {
    state.storeProfile.logo = '';
    const logoInput = document.getElementById('set-store-logo');
    if (logoInput) logoInput.value = '';
    
    // Update Preview Immediately
    const logoPreview = document.getElementById('set-store-logo-preview');
    const logoPlaceholder = document.getElementById('set-store-logo-placeholder');
    const logoRemoveBtn = document.getElementById('set-store-logo-remove');
    if (logoPreview) {
      logoPreview.src = '';
      logoPreview.style.display = 'none';
    }
    if (logoPlaceholder) logoPlaceholder.style.display = 'flex';
    if (logoRemoveBtn) logoRemoveBtn.style.display = 'none';
  });

  // 8. Edit Shift Discrepancy Form
  bindEvent('form-edit-shift', 'submit', async (e) => {
    e.preventDefault();
    const authCodeInput = document.getElementById('edit-shift-auth-code').value.trim().toUpperCase();
    if (authCodeInput !== getDailyAuthCode()) {
      showToast('Kode Otorisasi tidak valid!', 'error');
      return;
    }

    const shiftId = document.getElementById('edit-shift-id').value;
    const actualCash = parseFloat(document.getElementById('edit-shift-actual-cash').value) || 0;

    const s = state.shifts.find(x => x.id === shiftId);
    if (s) {
      s.actualCash = actualCash;
      const expected = s.startingCash + s.cashSales;
      s.drawerDiscrepancy = s.actualCash - expected;

      localStorage.setItem('aeropos_shifts', JSON.stringify(state.shifts));
      if (window.FirebaseDB && window.FirebaseDB.isConnected) {
        await window.FirebaseDB.saveShift(s);
      }
      renderShiftTabDetails();
      closeModal('modal-edit-shift');
      showToast('Koreksi selisih laci berhasil disimpan.', 'success');
    }
  });
}

function setupButtonListeners() {
  // Modal Close attributes triggers
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      closeModal(e.currentTarget.getAttribute('data-close'));
    });
  });

  // Trigger modal checkout
  bindEvent('cart-pay-btn', 'click', () => {
    initCheckoutModal();
  });

  // Clear Cart trigger
  bindEvent('btn-clear-cart', 'click', () => {
    state.cart = [];
    renderCart();
    showToast('Keranjang belanja telah dikosongkan.');
  });

  // Reset Shift History
  bindEvent('btn-reset-shift-history', 'click', () => {
    if (confirm("Apakah Anda yakin ingin mereset seluruh histori shift? Data yang dihapus tidak dapat dikembalikan.")) {
      state.shifts = state.activeShift ? [state.activeShift] : [];
      localStorage.setItem('aeropos_shifts', JSON.stringify(state.shifts));
      
      renderShiftTabDetails();
      showToast('Histori shift berhasil direset.', 'success');
    }
  });

  // Report Date Filter
  bindEvent('report-date-filter', 'change', () => {
    state.reportCurrentPage = 1;
    renderLaporanDashboard();
  });

  // Report Printing
  bindEvent('btn-print-report', 'click', () => {
    openModal('modal-print-report');
  });

  bindEvent('form-print-report', 'submit', (e) => {
    e.preventDefault();
    const optSummary = document.getElementById('print-opt-summary').checked;
    const optHistory = document.getElementById('print-opt-history').checked;
    const optChart = document.getElementById('print-opt-chart').checked;

    if (!optSummary && !optHistory && !optChart) {
      showToast('Pilih setidaknya satu opsi laporan untuk dicetak.', 'warning');
      return;
    }

    printReport(optSummary, optHistory, optChart);
    closeModal('modal-print-report');
  });

  // Report Pagination
  bindEvent('btn-report-prev', 'click', () => {
    if (state.reportCurrentPage > 1) {
      state.reportCurrentPage--;
      renderLaporanDashboard();
    }
  });

  bindEvent('btn-report-next', 'click', () => {
    state.reportCurrentPage++;
    renderLaporanDashboard();
  });

  // Cart Add customer modal quick-add
  bindEvent('cart-add-customer-btn', 'click', () => {
    const titleEl = document.getElementById('modal-customer-title');
    const idEl = document.getElementById('cust-id');
    const nameEl = document.getElementById('cust-name');
    const phoneEl = document.getElementById('cust-phone');

    if (titleEl) titleEl.textContent = 'Tambah Pelanggan Baru';
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    openModal('modal-customer');
  });

  // Inventory Bulk Add trigger
  bindEvent('inventory-bulk-add-btn', 'click', () => {
    document.getElementById('bulk-stock-amount').value = '';
    openModal('modal-bulk-stock');
  });

  // Bulk Stock Update Form
  bindEvent('form-bulk-stock', 'submit', async (e) => {
    e.preventDefault();
    const addAmount = parseInt(document.getElementById('bulk-stock-amount').value, 10);
    
    if (isNaN(addAmount) || addAmount <= 0) {
      showToast('Jumlah tidak valid.', 'error');
      return;
    }

    if (state.products.length === 0) {
      showToast('Tidak ada produk untuk diupdate stok.', 'warning');
      closeModal('modal-bulk-stock');
      return;
    }

    if (confirm(`Anda yakin ingin menambahkan +${addAmount} stok ke SEMUA (${state.products.length}) produk?`)) {
      // Update local state
      state.products.forEach(p => {
        p.stock += addAmount;
      });
      
      localStorage.setItem('aeropos_products', JSON.stringify(state.products));
      
      if (window.FirebaseDB && window.FirebaseDB.isConnected) {
         for (const p of state.products) {
           await window.FirebaseDB.saveProduct(p);
         }
      }

      renderInventoryAdmin();
      closeModal('modal-bulk-stock');
      showToast(`Berhasil menambahkan +${addAmount} stok ke semua produk.`, 'success');
    }
  });

  // Inventory Add Product modal trigger
  bindEvent('inventory-add-btn', 'click', () => {
    const titleEl = document.getElementById('modal-product-title');
    const idEl = document.getElementById('prod-id');
    const skuEl = document.getElementById('prod-sku');
    const nameEl = document.getElementById('prod-name');
    const stockEl = document.getElementById('prod-stock');
    const buyEl = document.getElementById('prod-buy-price');
    const sellEl = document.getElementById('prod-sell-price');

    if (titleEl) titleEl.textContent = 'Tambah Produk Baru';
    if (idEl) idEl.value = '';
    if (skuEl) skuEl.value = '';
    if (nameEl) nameEl.value = '';
    if (stockEl) stockEl.value = '10';
    if (buyEl) buyEl.value = '';
    if (sellEl) sellEl.value = '';
    openModal('modal-product');
  });

  // Customer Add Modal trigger
  bindEvent('customer-add-btn', 'click', () => {
    const titleEl = document.getElementById('modal-customer-title');
    const idEl = document.getElementById('cust-id');
    const nameEl = document.getElementById('cust-name');
    const phoneEl = document.getElementById('cust-phone');

    if (titleEl) titleEl.textContent = 'Tambah Pelanggan Baru';
    if (idEl) idEl.value = '';
    if (nameEl) nameEl.value = '';
    if (phoneEl) phoneEl.value = '';
    openModal('modal-customer');
  });

  // Sidebar Tutup Shift trigger shortcut
  bindEvent('sidebar-shift-action-btn', 'click', () => {
    initCloseShiftModal();
  });

  // Search input typing filters
  bindEvent('kasir-search-input', 'input', () => {
    renderCatalogGrid();
  });
  bindEvent('inventory-search-input', 'input', () => {
    renderInventoryTable();
  });
  bindEvent('customer-search-input', 'input', () => {
    renderCustomerTable();
  });

  // Cart math events
  bindEvent('cart-discount-input', 'input', () => {
    recalculateCartMath();
  });
  bindEvent('cart-tax-input', 'input', () => {
    recalculateCartMath();
  });

  // Payment checkout button selection triggers
  document.querySelectorAll('.payment-method-card-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const method = e.currentTarget.getAttribute('data-method');
      setCheckoutPaymentMethod(method);
    });
  });

  // Pay Cash change events
  bindEvent('checkout-cash-received', 'input', () => {
    validateCashReceived();
  });

  // Submit checkout final process
  bindEvent('checkout-submit-btn', 'click', () => {
    processPOSCheckout();
  });

  // Connection Badge guide clicker
  bindEvent('connection-banner', 'click', () => {
    openModal('modal-setup-guide');
  });

  // Save Firebase settings handler
  bindEvent('btn-save-firebase-config', 'click', async () => {
    const jsonStr = document.getElementById('set-firebase-json').value.trim();
    if (!jsonStr) {
      showToast('JSON Firebase tidak boleh kosong!', 'warning');
      return;
    }

    try {
      const config = JSON.parse(jsonStr);
      if (!config.apiKey || !config.projectId) {
        throw new Error("Format JSON Firebase tidak lengkap.");
      }

      showToast('Mencoba menyambung Firebase...', 'warning');
      const success = await window.FirebaseDB.reinitialize(config);
      
      if (success) {
        showToast('Firebase berhasil tersambung!', 'success');
        updateConnectionStatusUI();
        setupFirebaseSyncListeners();
        // Reload panels
        switchTab('kasir');
      } else {
        showToast('Gagal menyambung Firebase. Periksa konsol browser.', 'error');
      }
    } catch (e) {
      showToast('Format JSON Firebase tidak valid!', 'error');
    }
  });

  // Disconnect Firebase settings handler
  bindEvent('btn-disconnect-firebase', 'click', () => {
    if (confirm("Apakah Anda yakin ingin memutuskan integrasi Firebase? Sistem akan kembali ke penyimpanan local storage.")) {
      window.FirebaseDB.disconnect();
      updateConnectionStatusUI();
      refreshAppData().then(() => {
        switchTab('kasir');
        showToast('Firebase terputus. Kembali ke Mode Demo.', 'success');
      });
    }
  });

  // Firebase Sync data migrator handler
  bindEvent('btn-migrate-local-data', 'click', async () => {
    if (confirm("Ingin mengunggah seluruh produk lokal, riwayat checkout, dan CRM ke Firebase?")) {
      const progressBox = document.getElementById('migration-progress-box');
      const progressText = document.getElementById('migration-progress-text');
      const progressBar = document.getElementById('migration-progress-bar');
      const migrateBtn = document.getElementById('btn-migrate-local-data');

      if (migrateBtn) migrateBtn.disabled = true;
      if (progressBox) progressBox.style.display = 'block';

      const success = await window.FirebaseDB.migrateLocalData((percent) => {
        if (progressText) progressText.textContent = `${percent}%`;
        if (progressBar) progressBar.style.width = `${percent}%`;
      });

      if (migrateBtn) migrateBtn.disabled = false;
      
      if (success) {
        showToast('Migrasi data ke Firebase sukses!', 'success');
        setTimeout(() => {
          if (progressBox) progressBox.style.display = 'none';
          refreshAppData().then(() => renderInventoryTable());
        }, 1500);
      } else {
        showToast('Gagal mengunggah data. Cek koneksi Anda.', 'error');
      }
    }
  });

  // Backup Export trigger
  bindEvent('btn-export-backup', 'click', () => {
    const data = {
      products: window.LocalDB.getProducts(),
      customers: window.LocalDB.getCustomers(),
      transactions: window.LocalDB.getTransactions(),
      shifts: window.LocalDB.getShifts(),
      storeProfile: state.storeProfile
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aeropos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup data berhasil diunduh!', 'success');
  });

  // Backup Reset trigger
  bindEvent('btn-reset-db', 'click', () => {
    if (confirm("PERINGATAN! Seluruh data transaksi, CRM, dan stok lokal Anda akan dihapus permanen. Lanjutkan reset?")) {
      window.LocalDB.resetAllData();
      showToast('Database berhasil direset. Memuat ulang browser...', 'warning');
      setTimeout(() => location.reload(), 1500);
    }
  });

  // Logout button trigger
  bindEvent('btn-logout', 'click', () => {
    if (confirm("Apakah Anda yakin ingin keluar dari sistem?")) {
      sessionStorage.removeItem('aeropos_current_user');
      window.location.href = 'index.html';
    }
  });
}

// Bind POS actions to browser keyboard events
function setupKeyboardHotkeys() {
  document.addEventListener('keydown', (e) => {
    // F2: Focus Cashier search input
    if (e.key === 'F2') {
      e.preventDefault();
      switchTab('kasir');
      const searchInput = document.getElementById('kasir-search-input');
      if (searchInput) searchInput.focus();
    }
    
    // F4: Open payment checkout modal
    if (e.key === 'F4') {
      e.preventDefault();
      if (state.activeTab === 'kasir') {
        initCheckoutModal();
      }
    }
    
    // F8: Focus cash received input when payment checkout modal is open
    if (e.key === 'F8') {
      const checkoutModal = document.getElementById('modal-checkout');
      if (checkoutModal && checkoutModal.classList.contains('active') && activePaymentMethod === 'Tunai') {
        e.preventDefault();
        const cashInput = document.getElementById('checkout-cash-received');
        if (cashInput) cashInput.focus();
      }
    }
    
    // ESC: Close open modals, or clear cashier cart if no modals are open
    if (e.key === 'Escape') {
      const activeModal = document.querySelector('.modal-overlay.active');
      if (activeModal) {
        closeModal(activeModal.id);
      } else if (state.activeTab === 'kasir' && state.cart.length > 0) {
        if (confirm("Kosongkan keranjang belanja kasir?")) {
          state.cart = [];
          renderCart();
          showToast('Keranjang dikosongkan.');
        }
      }
    }
  });
}

// ================= EXPORTS WINDOW SCOPES =================

window.App = {
  updateCartQty,
  editProductItem,
  deleteProductItem,
  editCustomerItem,
  reprintTransaction,
  initOpenShiftModal,
  initCloseShiftModal,
  initEditShiftModal
};
