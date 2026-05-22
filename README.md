# AeroPOS - Aplikasi Kasir & POS Awan Modern

AeroPOS adalah aplikasi Point of Sale (POS) & Kasir modern berbasis web yang dirancang untuk kecepatan, keandalan, dan kemudahan operasional UMKM maupun bisnis profesional. Aplikasi ini mengutamakan efisiensi visual (minim klik), visualisasi analitik, dan pengelolaan data kasir.

Aplikasi ini menggunakan arsitektur **Hybrid Database Adapter** yang mendukung dua mode:
1. **Mode Demo (Local Storage)**: Berjalan instan secara offline menggunakan database lokal browser (`localStorage` & IndexedDB) dengan data dummy siap pakai.
2. **Mode Firebase (Cloud & Sync)**: Terkoneksi langsung ke database awan Firebase Firestore dengan dukungan pencadangan data *offline-first* (sinkronisasi otomatis ketika internet terputus).

---

## 🚀 Fitur Utama

- **Transaksi Kasir Cepat (POS)**:
  - Pencarian barang dengan latensi milidetik.
  - Category Filter chips untuk mempercepat pemilihan barang secara visual.
  - Perhitungan subtotal, diskon (nominal / persentase), dan pajak PPN (11% default) secara real-time.
  - Simulasi scan QRIS otomatis (menunggu scan dan checkout sukses) & pembayaran EDC.
- **Inventaris & Manajemen Stok Real-Time**:
  - CRUD produk lengkap (SKU, nama, harga beli modal, harga jual, stok, kategori).
  - Alergi visual stok menipis (badge berdenyut merah di bawah 5 item) & tombol disable otomatis jika stok habis.
  - **Tambah Stok Massal**: Menambahkan stok ke seluruh produk secara bersamaan dengan cepat.
- **CRM & Manajemen Pelanggan**:
  - Pencatatan pelanggan tetap (nama, WhatsApp).
  - Penghitungan loyalty points otomatis (1 poin setiap pembelanjaan Rp 10.000).
- **Laporan & Analitik (Dashboard)**:
  - Ringkasan omset (revenue), laba kotor, jumlah transaksi, dan barang kritis.
  - Grafik Penjualan Harian (omset vs. profit) interaktif dalam 7 hari terakhir.
  - Grafik Produk Terlaris (top 5 item terlaris).
  - Tabel histori transaksi (mendukung penomoran otomatis & filter tanggal) dengan fitur paginasi (batasan per halaman).
  - Fitur **Cetak Laporan** dengan keleluasaan memilih opsi bagian laporan yang ingin dicetak (Ringkasan Metrik, Riwayat, atau Grafik).
- **Shift & Multi-Role Pengguna**:
  - Simulasi otentikasi login kasir vs. admin.
  - Pembatasan hak akses (kasir hanya bisa transaksi & kelola shift mereka; admin memiliki akses penuh ke laporan laba rugi dan pengaturan).
  - Sistem kas laci (input laci kas awal, pelacakan nominal tunai, perhitungan selisih/discrepancy saat shift ditutup, rekap log shift).
  - Fitur **Koreksi Selisih Laci** (Admin) untuk menyesuaikan data aktual shift yang didukung dengan sistem validasi **Kode Otorisasi Harian** unik dari Kasir.
  - Opsi reset riwayat tutup shift untuk pembersihan log kas.
- **Pengaturan & Branding Toko**:
  - Mengubah nama, alamat, nomor telepon, dan pesan struk toko secara dinamis.
  - Unggah & ganti **Logo Toko** dengan sinkronisasi *real-time* yang otomatis mengubah *Favicon* (*icon tab browser*).
- **Cetak Struk Thermal**:
  - Format cetak struk kompatibel untuk printer thermal Bluetooth / USB ukuran 58mm atau 80mm.

---

## ⌨️ Shortcut Keyboard (Hotkeys)

AeroPOS dilengkapi dengan shortcut keyboard untuk meminimalkan penggunaan mouse/touchpad pada komputer kasir:

| Tombol | Fungsi |
| :--- | :--- |
| **`F2`** | Fokus otomatis ke kolom Pencarian Produk |
| **`F4`** | Buka laci pembayaran / Checkout drawer |
| **`F8`** | Fokus langsung ke kolom "Uang Diterima" (ketika checkout tunai aktif) |
| **`ESC`** | Tutup modal yang terbuka, ATAU kosongkan keranjang (jika di layar POS) |

---

## 🛠️ Tech Stack & Modul Proyek

Aplikasi ini tidak memerlukan instalasi server lokal (XAMPP/PHP/Node.js) untuk berjalan. Anda hanya perlu membuka file `index.html` langsung di browser Anda!

- **Frontend**: HTML5, CSS3 Custom Properties (modern slate theme & glassmorphism), JavaScript (Vanilla ES6 Modules)
- **Database**: Firebase Firestore (Web SDK v10 via ESM CDN) & Web LocalStorage
- **Library Visual**:
  - [Chart.js](https://www.chartjs.org/) (untuk grafik analitik laporan)
  - [FontAwesome 6.4.0](https://fontawesome.com/) (untuk ikon POS)

---

## ☁️ Cara Menyambungkan Firebase Firestore

Untuk mengaktifkan sinkronisasi awan, ikuti langkah berikut:

1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project baru.
2. Tambahkan aplikasi web (**Web App**) ke project Anda.
3. Salin potongan kode konfigurasi JSON Firebase SDK yang didapatkan. Contoh:
   ```json
   {
     "apiKey": "AIzaSyAxxxxxxxxxxxxxx",
     "authDomain": "proyek-kasir-anda.firebaseapp.com",
     "projectId": "proyek-kasir-anda",
     "storageBucket": "proyek-kasir-anda.appspot.com",
     "messagingSenderId": "1234567890",
     "appId": "1:123456:web:abcd123"
   }
   ```
4. Buka aplikasi AeroPOS Anda, lalu masuk ke menu **Pengaturan**.
5. Tempel kode JSON tersebut ke dalam kolom **Firebase Config JSON**, kemudian klik **Sambungkan Firebase**.
6. Klik **Mulai Unggah / Migrasi Data** untuk mengunggah seluruh produk demo dan riwayat lokal Anda langsung ke awan Firestore!

---

## 📂 Struktur File Proyek

```
Aplikasi Kasir/
├── index.html        # Kerangka Halaman Login & Pemilih Peran
├── kasir.html        # Interface Khusus Kasir (POS, Shift Kasir, Pelanggan)
├── admin.html        # Interface Khusus Admin (Dashboard Laporan, Manajemen Inventori Lengkap, Pengaturan Toko)
├── styles.css        # Desain layout, grid katalog, components, & animasi UI
├── receipt.css       # Format cetak struk monospaced khusus printer thermal
├── app.js            # Controller logika utama, sinkronisasi UI, dan manipulasi data state
├── local-db.js       # Database lokal (localStorage) & script seed data demo
├── firebase-db.js    # Konektor Firebase Firestore dengan offline caching
└── README.md         # Dokumentasi petunjuk penggunaan aplikasi
```

---

<p align="center">
  <a href="https://kenzodchjandcuh.github.io/Web-Kasir-By-Kenzo-Project/admin.html">Web Kasir Online</a> © 2026 by <a href="https://kenzodchjandcuh.github.io/cv/">Kenzo Project Developer</a> is licensed under <a href="https://creativecommons.org/licenses/by-nd/4.0/">Creative Commons Attribution-NoDerivatives 4.0 International</a><img src="https://mirrors.creativecommons.org/presskit/icons/cc.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/by.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;"><img src="https://mirrors.creativecommons.org/presskit/icons/nd.svg" alt="" style="max-width: 1em;max-height:1em;margin-left: .2em;">
</p>
