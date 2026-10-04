# personal-financial-cockpit-
# ⚡ CASHFLOW — Personal Finance Web App

Aplikasi pencatatan dan manajemen keuangan personal berbasis **Google Apps Script (GAS)** dan **Google Sheets**, dirancang khusus untuk pelajar/mahasiswa agar pengelolaan arus kas harian menjadi lebih presisi, disiplin, dan mudah dipantau.

---

## 🌟 Fitur Utama

- **Dashboard Financial Overview**: Ringkasan saldo akumulatif (*Current Balance*), pemasukan & pengeluaran bulan berjalan, batas belanja harian, indikator *Health Score*, serta *Smart Financial Insights*.
- **Visualisasi Pengeluaran**: Grafik donat interaktif pengeluaran berdasarkan kategori.
- **Pencatatan Transaksi**: Input cepat transaksi (*+ Pemasukan* dan *- Pengeluaran*) yang langsung tersinkronisasi dua arah ke database Google Sheets.
- **Budgeting System**: Manajemen batas alokasi anggaran tiap kategori pengeluaran dengan indikator *over/under budget*.
- **Financial Reports & Analytics**: Filter laporan berkala (*This Month*, *Last Month*, *This Year*, atau rentang kustom) untuk evaluasi performa *saving rate*, arus kas, dan *Needs vs Wants*.
- **Export Laporan ke PDF**: Generate laporan keuangan format A4 standar yang rapi, informatif, dan siap dicetak/diunduh.

---

## 🛠️ Tech Stack & Arsitektur

- **Backend**: Google Apps Script (JavaScript Engine V8)
- **Database**: Google Sheets (Spreadsheet)
- **Frontend**: HTML5, CSS3 (Modern Dark Theme), Vanilla JavaScript
- **PDF Engine**: Google Apps Script HTML Service Blob to PDF

---

## 📂 Struktur Project

```text
├── Code.gs             # Backend logic inti (CRUD Transaksi, Budget, Dashboard data)
├── ReportsBackend.gs   # Backend logic kalkulasi laporan berkala & PDF Generator
├── Index.html          # Frontend view utama (Navbar, Dashboard, Transaksi, Budget, Reports)
├── PdfTemplate.html    # Template dokumen A4 laporan keuangan untuk ekspor PDF
└── Database (Sheets)   # Google Spreadsheet penyimpanan data transaksi & budget
