# Installation Guide - Fastset DEX

Panduan instalasi lengkap untuk Fastset DEX.

## Prerequisites

Pastikan sistem Anda memiliki:

- **Node.js**: Version 18.0.0 atau lebih tinggi
- **npm**: Version 9.0.0 atau lebih tinggi (biasanya sudah include dengan Node.js)
- **Git**: Untuk clone repository (optional)
- **Terminal**: Command line interface

### Check Prerequisites

```bash
# Check Node.js version
node --version
# Output: v18.x.x atau lebih tinggi

# Check npm version
npm --version
# Output: 9.x.x atau lebih tinggi

# Check Git version (optional)
git --version
# Output: git version 2.x.x
```

## Installation Steps

### Step 1: Navigate to Project Directory

```bash
cd /path/to/fastset
```

### Step 2: Install Backend Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected output**:
```
fastset-dex-backend@1.0.0
├── @mysten/bcs@1.9.2
├── @noble/ed25519@3.0.0
├── @noble/hashes@1.3.3
├── cors@2.8.5
├── dotenv@16.3.1
├── express@4.18.2
└── node-fetch@3.3.2
```

### Step 3: Configure Backend Environment

File `.env` sudah tersedia dengan konfigurasi default:

```bash
# Verify .env file exists
cat .env
```

**Content**:
```env
PORT=3001
FASTSET_PROXY_URL=https://proxy.fastset.xyz/
NODE_ENV=development
DEX_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000000000000000000000000000
FEE_PERCENTAGE=0.3
MIN_LIQUIDITY=1000
```

Jika perlu, edit file `.env` sesuai kebutuhan.

### Step 4: Test Backend

```bash
# Start backend in development mode
npm run dev
```

**Expected output**:
```
🚀 Fastset DEX API running on port 3001
📡 Proxy URL: https://proxy.fastset.xyz/
```

Jika muncul output di atas, backend berhasil diinstall! ✅

Press `Ctrl+C` untuk stop server.

### Step 5: Install Frontend Dependencies

Buka terminal baru (jangan close terminal backend):

```bash
# Navigate to frontend folder (from project root)
cd frontend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected output**:
```
fastset-dex-frontend@1.0.0
├── @mysten/bcs@1.9.2
├── @noble/ed25519@3.0.0
├── @noble/hashes@1.3.3
├── axios@1.6.2
├── react@18.2.0
└── react-dom@18.2.0
```

### Step 6: Configure Frontend Environment

File `.env` sudah tersedia dengan konfigurasi default:

```bash
# Verify .env file exists
cat .env
```

**Content**:
```env
VITE_API_URL=http://localhost:3001/api/dex
VITE_FASTSET_PROXY_URL=https://proxy.fastset.xyz/
```

Jika perlu, edit file `.env` sesuai kebutuhan.

### Step 7: Test Frontend

```bash
# Start frontend in development mode
npm run dev
```

**Expected output**:
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

Jika muncul output di atas, frontend berhasil diinstall! ✅

### Step 8: Verify Installation

1. **Backend**: Buka `http://localhost:3001` di browser
   - Anda akan melihat JSON response dengan API info

2. **Frontend**: Buka `http://localhost:3000` di browser
   - Anda akan melihat UI Fastset DEX

## Post-Installation

### Running the Application

Setelah instalasi selesai, untuk menjalankan aplikasi:

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Stopping the Application

Press `Ctrl+C` di masing-masing terminal untuk stop server.

## Troubleshooting

### Issue 1: Port Already in Use

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3001
```

**Solution**:
```bash
# Find process using port 3001
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change PORT in backend/.env
PORT=3002
```

### Issue 2: Module Not Found

**Error**:
```
Error: Cannot find module '@mysten/bcs'
```

**Solution**:
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Issue 3: Permission Denied

**Error**:
```
Error: EACCES: permission denied
```

**Solution**:
```bash
# Fix npm permissions
sudo chown -R $USER:$GROUP ~/.npm
sudo chown -R $USER:$GROUP ~/.config

# Or use nvm (recommended)
# Install nvm first, then:
nvm install 18
nvm use 18
```

### Issue 4: Network Error

**Error**:
```
Error: getaddrinfo ENOTFOUND proxy.fastset.xyz
```

**Solution**:
- Check internet connection
- Check firewall settings
- Try using VPN if blocked

### Issue 5: React Build Error

**Error**:
```
Error: Failed to resolve entry for package "react"
```

**Solution**:
```bash
# Clear Vite cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install
```

## Verification Checklist

Setelah instalasi, verify semua berjalan dengan baik:

- [ ] Backend server berjalan di port 3001
- [ ] Frontend server berjalan di port 3000
- [ ] Buka `http://localhost:3001` menampilkan API info
- [ ] Buka `http://localhost:3000` menampilkan UI DEX
- [ ] Tidak ada error di terminal backend
- [ ] Tidak ada error di terminal frontend
- [ ] Browser console tidak ada error

## Next Steps

Setelah instalasi berhasil:

1. **Baca dokumentasi**: Lihat `README.md` untuk overview
2. **Quick start**: Ikuti `QUICKSTART.md` untuk mulai trading
3. **API docs**: Lihat `API.md` untuk API documentation
4. **Architecture**: Lihat `ARCHITECTURE.md` untuk technical details

## Development Setup

Untuk development yang lebih produktif:

### Install Nodemon (Backend)

Sudah included di devDependencies, tapi jika perlu install global:

```bash
npm install -g nodemon
```

### Install React DevTools (Frontend)

Install browser extension:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### VS Code Extensions (Recommended)

Install extensions untuk better DX:
- ESLint
- Prettier
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Path Intellisense

## Production Build

### Backend Production Build

```bash
cd backend

# Install production dependencies only
npm install --production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start src/index.js --name fastset-dex-api

# Or start normally
npm start
```

### Frontend Production Build

```bash
cd frontend

# Build for production
npm run build

# Output will be in dist/ folder
ls -la dist/

# Preview production build
npm run preview
```

## Docker Setup (Optional)

### Backend Dockerfile

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t fastset-dex-backend .
docker run -p 3001:3001 --env-file .env fastset-dex-backend
```

### Frontend Dockerfile

Create `frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Build and run:
```bash
docker build -t fastset-dex-frontend .
docker run -p 3000:80 fastset-dex-frontend
```

## System Requirements

### Minimum Requirements

- **CPU**: 2 cores
- **RAM**: 4 GB
- **Storage**: 1 GB free space
- **OS**: macOS, Linux, or Windows 10+
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+

### Recommended Requirements

- **CPU**: 4 cores
- **RAM**: 8 GB
- **Storage**: 5 GB free space
- **OS**: Latest version
- **Browser**: Latest version

## Support

Jika mengalami masalah saat instalasi:

1. **Check logs**: Lihat error messages di terminal
2. **Check documentation**: Baca `README.md` dan docs lainnya
3. **Check versions**: Pastikan Node.js dan npm version sesuai
4. **Clean install**: Delete node_modules dan reinstall
5. **Ask for help**: Create GitHub issue dengan detail error

## Uninstallation

Untuk uninstall aplikasi:

```bash
# Delete node_modules
rm -rf backend/node_modules
rm -rf frontend/node_modules

# Delete package-lock.json
rm backend/package-lock.json
rm frontend/package-lock.json

# Delete build outputs
rm -rf frontend/dist

# Optional: Delete entire project
cd ..
rm -rf fastset
```

---

**Installation Complete!** 🎉

Anda siap untuk mulai menggunakan Fastset DEX. Lihat `QUICKSTART.md` untuk panduan penggunaan.
