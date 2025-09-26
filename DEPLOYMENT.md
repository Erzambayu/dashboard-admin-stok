# 🚀 Panduan Deployment ke Vercel

Panduan step-by-step untuk deploy Dashboard Admin ke Vercel.

## Pre-requisites

- Akun Vercel (gratis) di [vercel.com](https://vercel.com)
- Project sudah di GitHub/GitLab/Bitbucket (recommended) atau folder local

## Method 1: Deploy via GitHub (Recommended)

### Step 1: Upload ke GitHub

1. **Buat repository baru di GitHub**
   - Kunjungi [github.com](https://github.com)
   - Click "New repository"
   - Nama repository: `dashboard-admin-stok`
   - Public atau Private (sesuai kebutuhan)
   - Jangan centang "Initialize with README" (karena sudah ada)

2. **Upload project ke GitHub**
   ```bash
   # Di folder project
   git init
   git add .
   git commit -m "Initial commit: Dashboard Admin Stok"
   git branch -M main
   git remote add origin https://github.com/USERNAME/dashboard-admin-stok.git
   git push -u origin main
   ```

### Step 2: Connect Vercel dengan GitHub

1. **Login ke Vercel**
   - Kunjungi [vercel.com](https://vercel.com)
   - Click "Login" → "Continue with GitHub"
   - Authorize Vercel untuk akses GitHub

2. **Import Project**
   - Di dashboard Vercel, click "Add New..." → "Project"
   - Pilih repository `dashboard-admin-stok`
   - Click "Import"

### Step 3: Configure Deployment

1. **Framework Detection**
   - Vercel otomatis detect "Next.js"
   - Root Directory: `./` (default)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

2. **Environment Variables**
   - Expand "Environment Variables" section
   - Add variable:
     - **Name**: `JWT_SECRET`
     - **Value**: `random-secret-key-minimum-32-characters`
   - Click "Add"

3. **Deploy**
   - Click "Deploy"
   - Wait 2-3 menit untuk build selesai
   - Akan mendapat URL seperti `https://dashboard-admin-stok-username.vercel.app`

## Method 2: Deploy via Vercel CLI

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login & Deploy

```bash
# Login ke Vercel
vercel login

# Di folder project, jalankan deploy
vercel

# Jawab prompt:
# ? Set up and deploy "~/dashboard-admin-stok"? [Y/n] Y
# ? Which scope? (your-username)
# ? Link to existing project? [y/N] N
# ? What's your project's name? dashboard-admin-stok
# ? In which directory is your code located? ./

# Untuk production deployment
vercel --prod
```

### Step 3: Set Environment Variables

```bash
# Set JWT secret
vercel env add JWT_SECRET

# Input value: random-secret-key-minimum-32-characters
# Environment: Production, Preview, Development (pilih semua)
```

## Method 3: Deploy via Drag & Drop

### Step 1: Prepare Project

1. **Zip project folder**
   - Exclude `node_modules`, `.git`, `.env.local`
   - Include semua file lainnya

### Step 2: Upload via Vercel Dashboard

1. **Login ke Vercel dashboard**
2. **Click "Add New..." → "Project"**
3. **Tab "Deploy a project"**
4. **Drag & drop zip file atau browse file**
5. **Framework: Next.js (auto-detect)**
6. **Add environment variable `JWT_SECRET`**
7. **Click "Deploy"**

## Post-Deployment Setup

### 1. Verify Deployment

- Buka URL yang diberikan Vercel
- Test login dengan credentials:
  - Username: `admin`
  - Password: `admin123`

### 2. Custom Domain (Optional)

1. **Di project settings → Domains**
2. **Add domain milik Anda**
3. **Configure DNS sesuai instruksi**

### 3. Enable Analytics

1. **Di project settings → Analytics**
2. **Enable Real Experience Score**
3. **Enable Audience**

## Troubleshooting

### Build Errors

**Error: Module not found**
```bash
# Solution: pastikan all dependencies di package.json
npm install --save missing-package
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

**Error: Next.js build failed**
- Check Next.js version compatibility
- Review build logs di Vercel dashboard
- Check file paths case-sensitivity

### Runtime Errors

**Error: data.json not found**
- Pastikan `data.json` ada di root folder
- Check capitalization (`data.json` not `Data.json`)

**Error: JWT secret not set**
- Set environment variable `JWT_SECRET` di Vercel
- Redeploy atau wait for auto-redeploy

### Performance Issues

**Slow API responses**
- Vercel serverless functions have cold start
- Consider upgrading Vercel plan
- Optimize data.json size

## Production Optimizations

### 1. Environment Variables

**Required:**
```
JWT_SECRET=your-32-character-secret-key
```

**Optional:**
```
NODE_ENV=production
```

### 2. Custom Domain Setup

1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Add to Vercel project**
3. **Configure DNS:**
   ```
   Type: CNAME
   Name: www
   Value: your-project.vercel.app
   
   Type: A
   Name: @
   Value: 76.76.19.61 (Vercel IP)
   ```

### 3. Performance Monitoring

- **Vercel Analytics**: Automatically enabled
- **Error Tracking**: Check Function Logs
- **Performance**: Real User Monitoring

## Backup & Restore

### Backup data.json

```bash
# Download current data.json
curl https://your-app.vercel.app/api/backup > backup-data.json

# Or manual: copy content dari GitHub repository
```

### Restore data

1. **Update data.json di repository**
2. **Commit & push changes**
3. **Vercel auto-redeploy**

## Scaling Considerations

### Traffic Limits (Hobby Plan)
- **Bandwidth**: 100GB/month
- **Function Executions**: 100GB-hours/month
- **Build time**: 6 hours/month

### Upgrade to Pro ($20/month)
- **Bandwidth**: 1TB/month  
- **Function Executions**: 1000GB-hours/month
- **Advanced analytics**
- **Password protection**

### Database Migration (Future)

Untuk scale lebih besar, consider:
- **PostgreSQL** (Supabase, PlanetScale)
- **MongoDB** (MongoDB Atlas)
- **Redis** (Upstash) untuk caching

## Security Checklist

- ✅ HTTPS enabled (Vercel default)
- ✅ Environment variables set
- ✅ Strong JWT secret (32+ characters)
- ✅ Input validation implemented
- ✅ CORS configured
- ⚠️ Change default admin password
- ⚠️ Setup regular backups
- ⚠️ Monitor access logs

## Support & Resources

- **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **Vercel Community**: [github.com/vercel/vercel/discussions](https://github.com/vercel/vercel/discussions)

---

**Selamat! 🎉 Dashboard Admin Anda sudah live di internet!**

Bagikan URL dengan tim dan mulai kelola stok dengan mudah.