# Fastset DEX Frontend

Frontend UI untuk Fastset DEX yang mendukung swap token, add liquidity, dan remove liquidity.

## Fitur

- ✅ **Swap Token**: Interface intuitif untuk swap token
- ✅ **Add Liquidity**: Tambahkan liquidity ke pool dengan mudah
- ✅ **Remove Liquidity**: Tarik liquidity dari pool
- ✅ **Real-time Calculation**: Perhitungan real-time untuk semua operasi
- ✅ **Slippage Protection**: Kontrol slippage tolerance
- ✅ **Price Impact Display**: Tampilan price impact untuk setiap swap
- ✅ **Wallet Connection**: Koneksi wallet dengan Fastset address
- ✅ **Responsive Design**: UI modern dan responsive

## Teknologi

- React 18
- Vite
- Axios
- CSS3 (Custom styling)

## Instalasi

```bash
cd frontend
npm install
```

## Konfigurasi

Buat file `.env` dari template:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:3001/api/dex
VITE_FASTSET_PROXY_URL=https://proxy.fastset.xyz/
```

## Menjalankan Development Server

```bash
npm run dev
```

Frontend akan berjalan di `http://localhost:3000`

## Build untuk Production

```bash
npm run build
```

File production akan ada di folder `dist/`

## Preview Production Build

```bash
npm run preview
```

## Struktur Folder

```
frontend/
├── public/                    # Static assets
├── src/
│   ├── components/           # React components
│   │   ├── SwapPanel.jsx    # Komponen swap
│   │   ├── AddLiquidityPanel.jsx
│   │   ├── RemoveLiquidityPanel.jsx
│   │   └── WalletConnect.jsx
│   ├── hooks/               # Custom React hooks
│   │   └── useWallet.js     # Wallet management hook
│   ├── utils/               # Utility functions
│   │   ├── api.js           # API client
│   │   └── tokens.js        # Token utilities
│   ├── styles/              # CSS styles
│   │   └── App.css          # Main stylesheet
│   ├── App.jsx              # Main app component
│   └── main.jsx             # Entry point
├── index.html
├── vite.config.js
└── package.json
```

## Cara Menggunakan

### 1. Install Fastset Wallet Extension

Sebelum menggunakan DEX, install Fastset Wallet Extension:

1. Download dari [Chrome Web Store](https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe)
2. Create atau import wallet
3. Backup recovery phrase (12-24 words)
4. Set password untuk security

### 2. Hubungkan Wallet

1. Klik tombol "Hubungkan Fastset Wallet"
2. Approve connection di popup wallet
3. Wallet akan otomatis terhubung

**Note**: Wallet extension akan inject `window.fastset` API ke browser untuk komunikasi dengan dApp.

### 3. Swap Token

1. Pilih token yang ingin ditukar (From)
2. Pilih token tujuan (To)
3. Masukkan jumlah
4. Lihat estimasi output dan price impact
5. Atur slippage tolerance jika perlu
6. Klik "Swap"
7. Approve transaction di wallet popup

### 4. Tambah Liquidity

1. Pilih pasangan token (Token A dan Token B)
2. Masukkan jumlah untuk kedua token
3. Lihat estimasi LP tokens yang akan diterima
4. Lihat pool share Anda
5. Klik "Tambah Liquidity"

### 5. Tarik Liquidity

1. Pilih pasangan token
2. Lihat LP balance Anda
3. Masukkan jumlah LP tokens yang ingin ditarik (atau klik "Max")
4. Lihat estimasi token yang akan diterima
5. Klik "Tarik Liquidity"
6. Approve transaction di wallet popup

## Wallet Integration

### Fastset Wallet Extension

Frontend menggunakan Fastset Wallet Extension untuk:
- **Secure Connection**: Non-custodial wallet dengan local encryption
- **Auto-Detection**: Otomatis detect wallet installation
- **Event Listening**: Real-time updates saat account berubah
- **Transaction Signing**: Sign transactions dengan Ed25519

### Wallet API

```javascript
// Check wallet installation
const isInstalled = typeof window.fastset !== 'undefined';

// Request connection
const accounts = await window.fastset.request({
  method: 'fastset_requestAccounts'
});

// Sign transaction
const signature = await window.fastset.request({
  method: 'fastset_signTransaction',
  params: { transaction }
});
```

Lihat [WALLET_INTEGRATION.md](../WALLET_INTEGRATION.md) untuk dokumentasi lengkap.

## Fitur UI

### Design Modern

- Dark theme dengan gradient
- Smooth animations dan transitions
- Responsive untuk semua ukuran layar
- Card-based layout
- Wallet connection status indicator

### Real-time Feedback

- Loading states
- Success/error alerts
- Price impact warnings
- Pool statistics

### User Experience

- Auto-calculation saat input berubah
- Token switching dengan animasi
- Max button untuk liquidity removal
- Clear error messages

## Token yang Didukung

Saat ini mendukung 3 token demo:

- **FAST**: Fast Token (decimals: 9)
- **USDC**: USD Coin (decimals: 6)
- **ETH**: Ethereum (decimals: 18)

Untuk menambah token baru, edit `src/utils/tokens.js`:

```javascript
export const TOKENS = {
  YOUR_TOKEN: {
    id: [/* 32 bytes array */],
    symbol: 'YOUR',
    name: 'Your Token',
    decimals: 9,
  },
  // ...
};
```

## API Integration

Frontend berkomunikasi dengan backend melalui REST API. Semua API calls ada di `src/utils/api.js`.

Endpoints yang digunakan:

- `POST /pool/info` - Get pool information
- `POST /swap/calculate` - Calculate swap output
- `POST /swap/execute` - Execute swap
- `POST /liquidity/add/calculate` - Calculate add liquidity
- `POST /liquidity/add/execute` - Execute add liquidity
- `POST /liquidity/remove/calculate` - Calculate remove liquidity
- `POST /liquidity/remove/execute` - Execute remove liquidity
- `POST /liquidity/balance` - Get user LP balance

## Styling

CSS menggunakan CSS Variables untuk theming:

```css
:root {
  --primary: #6366f1;
  --primary-dark: #4f46e5;
  --secondary: #8b5cf6;
  --success: #10b981;
  --warning: #f59e0b;
  --error: #ef4444;
  --bg-primary: #0f172a;
  --bg-secondary: #1e293b;
  --bg-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #cbd5e1;
  --border: #475569;
}
```

Untuk mengubah theme, edit nilai-nilai ini di `src/styles/App.css`.

## Development Tips

### Hot Module Replacement (HMR)

Vite mendukung HMR, jadi perubahan akan langsung terlihat tanpa refresh.

### React DevTools

Install React DevTools extension untuk debugging:
- [Chrome](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

### Error Handling

Semua error dari API akan ditampilkan di UI dengan alert merah. Check console untuk detail error.

## Production Considerations

Untuk production:

1. **Environment Variables**: Gunakan production API URL
2. **Error Tracking**: Tambahkan Sentry atau error tracking service
3. **Analytics**: Tambahkan Google Analytics atau Mixpanel
4. **Performance**: Optimize bundle size dengan code splitting
5. **SEO**: Tambahkan meta tags dan Open Graph tags
6. **PWA**: Pertimbangkan untuk membuat Progressive Web App

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Troubleshooting

### Backend tidak terhubung

Pastikan backend berjalan di `http://localhost:3001` atau update `VITE_API_URL` di `.env`.

### CORS Error

Backend sudah menggunakan CORS middleware. Jika masih error, check konfigurasi CORS di backend.

### Wallet tidak terhubung

Pastikan format address adalah JSON array dengan 32 bytes.

## License

ISC
