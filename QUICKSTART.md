# Quick Start Guide - Fastset DEX

Panduan cepat untuk menjalankan Fastset DEX di local machine.

## Prerequisites

Pastikan sudah terinstall:
- Node.js 18 atau lebih tinggi
- npm atau yarn

## Langkah 1: Setup Backend

```bash
# Masuk ke folder backend
cd backend

# Install dependencies
npm install

# File .env sudah tersedia, tidak perlu copy lagi
# Backend sudah dikonfigurasi untuk development

# Jalankan backend
npm run dev
```

Backend akan berjalan di `http://localhost:3001`

Anda akan melihat output:
```
🚀 Fastset DEX API running on port 3001
📡 Proxy URL: https://proxy.fastset.xyz/
```

## Langkah 2: Setup Frontend (Terminal Baru)

Buka terminal baru:

```bash
# Masuk ke folder frontend
cd frontend

# Install dependencies
npm install

# File .env sudah tersedia
# Frontend sudah dikonfigurasi untuk connect ke backend

# Jalankan frontend
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## Langkah 3: Buka Browser

1. Buka browser dan akses `http://localhost:3000`
2. Anda akan melihat interface Fastset DEX

## Langkah 4: Hubungkan Wallet

1. Klik tombol "Hubungkan Wallet"
2. Masukkan address Fastset dalam format JSON array (32 bytes)

Contoh address untuk testing:
```json
[117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]
```

3. Klik "Hubungkan"

## Langkah 5: Mulai Trading!

### Swap Token

1. Pilih tab "Swap"
2. Pilih token yang ingin ditukar (From)
3. Pilih token tujuan (To)
4. Masukkan jumlah
5. Lihat estimasi output
6. Klik "Swap"

### Tambah Liquidity

1. Pilih tab "Tambah Liquidity"
2. Pilih pasangan token
3. Masukkan jumlah untuk kedua token
4. Lihat estimasi LP tokens
5. Klik "Tambah Liquidity"

### Tarik Liquidity

1. Pilih tab "Tarik Liquidity"
2. Pilih pasangan token
3. Masukkan jumlah LP tokens (atau klik "Max")
4. Lihat estimasi token yang akan diterima
5. Klik "Tarik Liquidity"

## Token yang Tersedia

Untuk testing, tersedia 3 token:

1. **FAST** - Fast Token
   - Token ID: `[250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]`

2. **USDC** - USD Coin
   - Token ID: `[123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]`

3. **ETH** - Ethereum
   - Token ID: `[234,56,78,90,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]`

## Troubleshooting

### Backend tidak bisa start

```bash
# Pastikan port 3001 tidak digunakan
lsof -i :3001

# Jika ada, kill process tersebut atau ubah PORT di .env
```

### Frontend tidak bisa connect ke backend

1. Pastikan backend sudah berjalan di port 3001
2. Check console browser untuk error
3. Pastikan CORS sudah dikonfigurasi dengan benar

### Calculation error

1. Pastikan input amount valid (angka positif)
2. Untuk swap, pastikan pool memiliki liquidity
3. Untuk add liquidity pertama kali, masukkan jumlah yang reasonable

## Tips

1. **Slippage**: Default slippage 0.5%, bisa diubah sesuai kebutuhan
2. **Price Impact**: Perhatikan price impact sebelum swap (merah = tinggi, kuning = medium, hijau = rendah)
3. **LP Tokens**: Simpan LP tokens Anda untuk mendapatkan fee dari swap
4. **Pool Share**: Semakin besar pool share, semakin besar fee yang didapat

## Next Steps

- Baca dokumentasi lengkap di `README.md`
- Explore API endpoints di `backend/README.md`
- Customize UI di `frontend/README.md`
- Tambahkan token baru di `frontend/src/utils/tokens.js`

## Support

Jika ada masalah:
1. Check logs di terminal backend dan frontend
2. Check console browser (F12)
3. Baca dokumentasi lengkap
4. Check Fastset documentation: https://docs.pi2.network

---

Selamat trading! 🚀
