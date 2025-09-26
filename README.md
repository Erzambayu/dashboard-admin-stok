# Dashboard Admin - Manajemen Stok Akun Premium

Dashboard web untuk mengelola stok akun premium, voucher, dan kode redeem dengan fitur CRUD lengkap, transaksi otomatis, laporan keuangan, dan audit log.

## 🚀 Fitur Utama

- **Autentikasi Admin** - Login dengan JWT sederhana
- **CRUD Items** - Tambah, edit, hapus, dan kelola stok item
- **Transaksi Keluar** - Otomatis mengurangi stok dan mencatat profit
- **Laporan Keuangan** - Modal vs pendapatan dengan analisis lengkap
- **Warning System** - Alert untuk item expired dan stok rendah
- **Audit Log** - Pencatatan aktivitas user dengan timestamp
- **Dashboard Responsive** - UI modern dengan Tailwind CSS

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: JSON file storage dengan atomic writes
- **Auth**: JWT dengan bcryptjs
- **Deployment**: Vercel (zero-config)

## 📦 Struktur Project

```
├── components/           # React components
│   ├── Dashboard.js     # Main dashboard
│   ├── LoginForm.js     # Login form
│   ├── Navbar.js        # Navigation
│   ├── ItemsTable.js    # Tabel kelola stok
│   ├── ItemForm.js      # Form tambah/edit item
│   ├── TransactionsTable.js # Tabel transaksi
│   ├── TransactionForm.js   # Form transaksi keluar
│   ├── ReportsPage.js   # Halaman laporan
│   └── AuditLogsPage.js # Halaman audit log
├── context/
│   └── AuthContext.js   # Context untuk autentikasi
├── lib/
│   └── dataManager.js   # Helper untuk data.json
├── pages/
│   ├── api/             # Serverless functions
│   │   ├── auth.js      # Autentikasi
│   │   ├── items.js     # CRUD items
│   │   ├── transactions.js # CRUD transaksi
│   │   ├── reports.js   # Generate laporan
│   │   └── audit-logs.js # Audit log
│   ├── _app.js          # App wrapper
│   └── index.js         # Homepage
├── styles/
│   └── globals.css      # Global styles + Tailwind
├── data.json            # Database JSON
├── package.json         # Dependencies
└── next.config.js       # Next.js config
```

## 🔧 Setup Development

### Prerequisites
- Node.js 18+ 
- npm atau yarn

### Installation

1. **Clone atau ekstrak project ini**
```bash
# Jika dari zip, ekstrak ke folder
# Atau clone jika ada git repo
```

2. **Install dependencies**
```bash
npm install
# atau
yarn install
```

3. **Setup environment variables (optional)**
```bash
# Buat file .env.local
JWT_SECRET=your-super-secret-jwt-key-here
```

4. **Jalankan development server**
```bash
npm run dev
# atau
yarn dev
```

5. **Buka browser**
```
http://localhost:3000
```

### Login Demo
- **Username**: `admin`
- **Password**: `admin123`

## 🚀 Deploy ke Vercel

### Metode 1: Deploy via Dashboard Vercel (Recommended)

1. **Buat akun Vercel**
   - Kunjungi [vercel.com](https://vercel.com)
   - Sign up dengan GitHub/GitLab/Bitbucket

2. **Upload project**
   - Buat repository baru di GitHub
   - Upload semua file project ke repository
   - Atau zip dan upload via Vercel dashboard

3. **Deploy di Vercel**
   - Login ke dashboard Vercel
   - Click "Add New..." → "Project"
   - Import repository atau upload folder
   - Framework preset: "Next.js" (auto-detected)
   - Click "Deploy"

4. **Environment Variables (Optional)**
   - Di project settings → Environment Variables
   - Tambahkan `JWT_SECRET` dengan value random string

### Metode 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
```bash
npm install -g vercel
```

2. **Login ke Vercel**
```bash
vercel login
```

3. **Deploy project**
```bash
vercel
```

4. **Ikuti prompt setup**
   - Set up and deploy? `Y`
   - Which scope? (pilih personal/team)
   - Link to existing project? `N`
   - Project name? (enter atau custom)
   - Directory? `./` (current directory)

5. **Production deployment**
```bash
vercel --prod
```

### Konfigurasi Vercel

File `vercel.json` (optional, untuk konfigurasi lanjutan):
```json
{
  "functions": {
    "pages/api/**/*.js": {
      "maxDuration": 10
    }
  },
  "regions": ["sin1"]
}
```

## 📊 Data Structure

### Items
```json
{
  "id": 1,
  "platform": "CapCut",
  "tipe": "akun", // akun, voucher, kode_redeem
  "stok": 10,
  "harga_modal": 15000,
  "harga_jual": 30000,
  "expired": "2025-10-30",
  "created_at": "2024-09-26T10:00:00Z",
  "updated_at": "2024-09-26T10:00:00Z",
  "updated_by": "admin"
}
```

### Transactions
```json
{
  "id": 1,
  "item_id": 1,
  "platform": "CapCut",
  "tipe": "akun",
  "jumlah": 2,
  "harga_modal": 15000,
  "harga_jual": 30000,
  "total_modal": 30000,
  "total_jual": 60000,
  "profit": 30000,
  "tanggal": "2024-09-25T14:30:00Z",
  "created_by": "admin"
}
```

## 🔐 API Endpoints

### Authentication
- `POST /api/auth` - Login & verify token
  ```json
  // Login
  { "action": "login", "username": "admin", "password": "admin123" }
  
  // Verify
  { "action": "verify" }
  // Headers: Authorization: Bearer <token>
  ```

### Items Management
- `GET /api/items` - Get all items
- `POST /api/items` - Create new item
- `PUT /api/items` - Update item
- `DELETE /api/items?id=1` - Delete item

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction (auto reduce stock)
- `DELETE /api/transactions?id=1` - Delete transaction (restore stock)

### Reports
- `GET /api/reports` - Get financial reports & analytics

### Audit Logs
- `GET /api/audit-logs?page=1&limit=20` - Get audit logs with pagination

## 🔒 Security Features

1. **JWT Authentication** - Semua API endpoint protected
2. **Atomic File Writes** - Mencegah corruption data.json
3. **Input Validation** - Validasi semua input user
4. **Audit Logging** - Track semua perubahan data
5. **CORS Protection** - Configured untuk security

## 📱 Mobile Responsive

Dashboard fully responsive untuk:
- Desktop (1024px+)
- Tablet (768px - 1023px) 
- Mobile (320px - 767px)

## 🎨 UI/UX Features

- **Modern Design** - Clean dashboard dengan Tailwind CSS
- **Status Indicators** - Color-coded untuk expired, low stock, dll
- **Loading States** - Feedback untuk semua async operations
- **Modal Forms** - Overlay forms untuk better UX
- **Confirmation Dialogs** - Safety untuk delete operations
- **Toast Notifications** - Success/error feedback

## 🐛 Troubleshooting

### Common Issues

1. **Build Error - Module not found**
   ```bash
   # Clear node_modules dan reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Data.json Permission Error**
   - Pastikan file `data.json` ada dan readable
   - Di Vercel, file akan di-serve dari memory

3. **JWT Error**
   ```bash
   # Set JWT_SECRET di environment variables
   # Default: 'your-secret-key-change-in-production'
   ```

4. **API Route Not Found**
   - Pastikan struktur folder `pages/api/` benar
   - Check case-sensitive file names

### Vercel Specific

1. **Serverless Function Timeout**
   - Default limit 10s untuk Hobby plan
   - Upgrade plan untuk limit lebih tinggi

2. **Data Persistence**
   - File system di serverless tidak persistent
   - Data.json di-load ke memory per request
   - Untuk production, consider database

## 🚀 Production Considerations

### Scalability
- **Database**: Migrate ke PostgreSQL/MongoDB untuk scale
- **File Storage**: Gunakan cloud storage untuk file uploads
- **Caching**: Implement Redis untuk performance
- **CDN**: Vercel edge cache sudah aktif

### Security Enhancements
- **Rate Limiting**: Implement untuk prevent abuse
- **HTTPS Only**: Enforce SSL (Vercel default)
- **Environment Variables**: Store secrets properly
- **Backup Strategy**: Regular backup data.json

### Monitoring
- **Vercel Analytics**: Built-in performance monitoring
- **Error Tracking**: Sentry integration
- **Uptime Monitoring**: External service monitoring

## 📞 Support

Jika ada issues atau pertanyaan:
1. Check troubleshooting section di atas
2. Review error logs di Vercel dashboard
3. Check browser console untuk frontend errors

## 📄 License

MIT License - Feel free to modify dan distribute.

---

**Happy coding! 🎉**

Dashboard ini siap deploy ke Vercel tanpa setup database eksternal. Semua data tersimpan di `data.json` dengan atomic write operations untuk reliability.