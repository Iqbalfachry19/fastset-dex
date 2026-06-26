# Fastset DEX - Decentralized Exchange

A complete **Decentralized Exchange (DEX)** application built on top of the **Fastset Protocol**. It supports token swaps, liquidity provisioning, and liquidity withdrawal using the **Automated Market Maker (AMM)** constant product formula.

---

# 🚀 Features

## Backend

* ✅ **Token Swaps** — Exchange tokens using an AMM with a 0.3% trading fee.
* ✅ **Add Liquidity** — Supply liquidity to pools and receive LP tokens.
* ✅ **Remove Liquidity** — Withdraw liquidity by burning LP tokens.
* ✅ **Pool Management** — Manage multiple liquidity pools.
* ✅ **Slippage Protection** — Protect users from excessive slippage.
* ✅ **Price Impact Calculation** — Calculate price impact in real time.
* ✅ **Fastset Integration** — Fully integrated with the Fastset Protocol.

## Frontend

* ✅ **Modern UI** — Clean dark-themed user interface.
* ✅ **Real-time Calculations** — Instantly updates quotes and estimates.
* ✅ **Wallet Connection** — Connect and interact with Fastset wallets.
* ✅ **Responsive Design** — Optimized for desktop and mobile devices.
* ✅ **User Feedback** — Loading indicators, alerts, and error handling.

---

# 📁 Project Structure

```text
fastset/
├── backend/                  # Backend API (Node.js + Express)
│   ├── config/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   │   ├── dexService.js
│   │   │   └── fastsetService.js
│   │   └── utils/
│   │       ├── amm.js
│   │       ├── bcs.js
│   │       └── crypto.js
│   ├── package.json
│   └── README.md
│
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── SwapPanel.jsx
│   │   │   ├── AddLiquidityPanel.jsx
│   │   │   ├── RemoveLiquidityPanel.jsx
│   │   │   └── WalletConnect.jsx
│   │   ├── hooks/
│   │   ├── utils/
│   │   └── styles/
│   ├── package.json
│   └── README.md
│
└── README.md
```

---

# 🛠️ Technology Stack

## Backend

* Node.js
* Express.js
* Fastset Protocol (BCS Serialization)
* Ed25519 Signatures (`@noble/ed25519`)
* BigInt for high-precision arithmetic

## Frontend

* React 18
* Vite
* Axios
* CSS3

---

# 📦 Installation

## Prerequisites

* Node.js 18+
* npm or Yarn

## 1. Clone the Repository

```bash
git clone <repository-url>
cd fastset
```

---

# 🤖 Agent Plugin CLI

For machine-to-machine integrations, use the CLI wrapper.

```bash
npm run fastset:cli -- list --pretty
npm run fastset:cli -- gen-test-keypair --pretty
npm run fastset:cli -- call account-info --body-json '{"address":[1,2,3]}' --pretty
```

* CLI Entry: `cli/fastset-dex-agent-cli.mjs`
* Skill Bundle: `agent-skills/fastset-dex-plugin/SKILL.md`
* Additional Agent Contract: `AGENTS.md`

---

# 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env

# Configure the environment variables

npm run dev
```

The backend will be available at:

```
http://localhost:3001
```

---

# 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env

# Configure the environment variables

npm run dev
```

The frontend will be available at:

```
http://localhost:3000
```

---

# 🎯 Getting Started

## 1. Start the Backend

```bash
cd backend
npm run dev
```

## 2. Start the Frontend

```bash
cd frontend
npm run dev
```

## 3. Open the Application

Navigate to:

```
http://localhost:3000
```

## 4. Connect Your Wallet

Click **Connect Wallet** and provide your Fastset wallet address as a 32-byte JSON array.

Example:

```json
[117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]
```

## 5. Start Trading

* Swap Tokens
* Add Liquidity
* Remove Liquidity

---

# 🔧 Configuration

## Backend (.env)

```env
PORT=3001
FASTSET_PROXY_URL=https://proxy.fastset.xyz/
NODE_ENV=development
DEX_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000000000000000000000000000
FEE_PERCENTAGE=0.3
MIN_LIQUIDITY=1000
```

## Frontend (.env)

```env
VITE_API_URL=http://localhost:3001/api/dex
VITE_FASTSET_PROXY_URL=https://proxy.fastset.xyz/
```

---

# 📊 AMM Formula

This DEX implements the **Constant Product Formula**, similar to **Uniswap V2**.

```
x * y = k
```

## Swap Formula

```
amountOut =
(reserveOut × amountIn × 997) /
(reserveIn × 1000 + amountIn × 997)
```

The formula includes the **0.3% trading fee**.

## Liquidity Minting

For a new pool:

```
liquidity =
sqrt(amountA × amountB) - MINIMUM_LIQUIDITY
```

For an existing pool:

```
liquidity =
min(
    amountA × totalSupply / reserveA,
    amountB × totalSupply / reserveB
)
```

---

# 🔌 API Endpoints

## Pool

```
POST /api/dex/pool/info
```

Retrieve pool information.

## Swap

```
POST /api/dex/swap/calculate
POST /api/dex/swap/execute
```

Calculate and execute token swaps.

## Liquidity

```
POST /api/dex/liquidity/add/calculate
POST /api/dex/liquidity/add/execute

POST /api/dex/liquidity/remove/calculate
POST /api/dex/liquidity/remove/execute

POST /api/dex/liquidity/balance
```

Calculate, add, remove liquidity, and retrieve LP token balances.

## Account

```
POST /api/dex/account/info
```

Retrieve account information.

For additional details, refer to:

* `backend/README.md`
* `frontend/README.md`

---

# 🧪 Testing

## Backend Tests

```bash
cd backend
npm test
```

## Example cURL Request

```bash
curl -X POST http://localhost:3001/api/dex/pool/info \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": [250,87,94,112,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
    "tokenB": [123,45,67,89,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
  }'
```

---

# 🚀 Deployment

## Backend

Install production dependencies:

```bash
cd backend
npm install --production
```

Then:

* Configure production environment variables.
* Deploy using PM2, Docker, or another process manager.

## Frontend

Build the application:

```bash
cd frontend
npm run build
```

Deploy the generated `dist/` directory to services such as:

* Vercel
* Netlify
* Nginx
* Cloudflare Pages

---

# 🔐 Security Considerations

* Never commit private keys.
* Store sensitive configuration in environment variables.
* Properly configure CORS in production.
* Implement API rate limiting.
* Validate and sanitize all user inputs.

---

# 📈 Performance

* **Backend:** Uses in-memory storage for demonstration purposes. A database is recommended for production deployments.
* **Frontend:** Powered by Vite for fast development and optimized builds.
* **Calculations:** Uses BigInt to eliminate floating-point precision issues.

---

# 🐛 Troubleshooting

## Unable to Connect to the Fastset Proxy

Verify that `FASTSET_PROXY_URL` is correctly configured and ensure your internet connection is available.

## Frontend Cannot Reach the Backend

Ensure the backend is running on the correct port and that CORS is properly configured.

## Calculation Errors

Verify that:

* Input amounts are valid.
* The liquidity pool contains sufficient liquidity.

---

# 📚 Documentation

* Backend Documentation (`backend/README.md`)
* Frontend Documentation (`frontend/README.md`)
* Fastset Protocol Documentation

---

# 🤝 Contributing

Contributions are welcome!

Please read the contributing guidelines before submitting pull requests.

---

# 📄 License

ISC License

---

# 👥 Authors

Built with ❤️ using the Fastset Protocol.

---

# 🔗 Resources

- [Fast Website](https://fast.xyz) 
- [Fast Docs](https://docs.fast.xyz) 
- [AllSet Portal](https://allset.fast.xyz)

---

> **Note**
>
> This project is intended as a demonstration and development environment. For production deployments, consider implementing:
>
> * Persistent database storage
> * Authentication and authorization
> * Rate limiting and enhanced security
> * Monitoring and logging
> * Load balancing and horizontal scaling
> * Comprehensive automated testing
