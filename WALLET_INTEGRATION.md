# Fastset Wallet Integration Guide

Panduan lengkap untuk integrasi Fastset Wallet Extension ke dalam aplikasi DEX.

## Overview

Fastset Wallet adalah browser extension non-custodial yang dibangun oleh Pi Squared untuk Fastset Network. Extension ini memungkinkan user untuk:

- 🔐 Kontrol penuh atas private keys (12-24 word recovery phrase)
- ⚡ Transaction dengan 150K TPS dan 0.25ms finality
- 💼 Manage multiple accounts
- 🔗 Connect ke dApps dengan aman
- 📊 Track portfolio activity

## Installation

### User Installation

1. **Download Extension**
   - Chrome Web Store: [Fastset Wallet](https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe)
   - Rating: 4.9/5 dengan 70,000+ users

2. **Setup Wallet**
   - Create new wallet atau import existing
   - Backup recovery phrase (12-24 words)
   - Set password untuk local encryption

3. **Connect to dApp**
   - Visit dApp (e.g., `http://localhost:3000`)
   - Click "Hubungkan Fastset Wallet"
   - Approve connection di popup wallet

## Developer Integration

### 1. Wallet Detection

Fastset Wallet inject `window.fastset` object ke browser:

```javascript
// Check if wallet is installed
const isInstalled = typeof window !== 'undefined' && typeof window.fastset !== 'undefined';

if (!isInstalled) {
  console.log('Fastset Wallet not installed');
  // Show install prompt
}
```

### 2. Request Connection

```javascript
// Request accounts from wallet
const accounts = await window.fastset.request({
  method: 'fastset_requestAccounts'
});

// accounts[0] contains:
// {
//   address: [117, 241, 196, ...], // 32 bytes array
//   publicKey: "0x75f1c4...",
//   name: "Account 1"
// }
```

### 3. Get Current Account

```javascript
// Get currently connected account
const accounts = await window.fastset.request({
  method: 'fastset_accounts'
});

const currentAccount = accounts[0];
```

### 4. Sign Transaction

```javascript
// Sign transaction
const signature = await window.fastset.request({
  method: 'fastset_signTransaction',
  params: {
    transaction: {
      sender: [117, 241, 196, ...],
      recipient: [193, 65, 80, ...],
      nonce: 225,
      timestamp_nanos: BigInt(Date.now()) * 1000000n,
      claim: {
        TokenTransfer: {
          token_id: [250, 87, 94, ...],
          amount: "1000000000",
          user_data: null
        }
      }
    }
  }
});

// signature is 64 bytes array
```

### 5. Send Transaction

```javascript
// Sign and send transaction
const result = await window.fastset.request({
  method: 'fastset_sendTransaction',
  params: {
    transaction: {...}
  }
});

// result contains:
// {
//   txHash: "0x...",
//   status: "success"
// }
```

### 6. Get Balance

```javascript
// Get token balance
const balance = await window.fastset.request({
  method: 'fastset_getBalance',
  params: {
    address: [117, 241, 196, ...],
    tokenId: [250, 87, 94, ...] // optional, null for all tokens
  }
});
```

### 7. Listen for Events

```javascript
// Listen for account changes
window.fastset.on('accountsChanged', (accounts) => {
  if (accounts.length > 0) {
    console.log('Account changed:', accounts[0]);
  } else {
    console.log('Disconnected');
  }
});

// Listen for disconnect
window.fastset.on('disconnect', () => {
  console.log('Wallet disconnected');
});

// Listen for chain changes (if multi-chain)
window.fastset.on('chainChanged', (chainId) => {
  console.log('Chain changed:', chainId);
});
```

## React Integration

### Using Custom Hook

Kami sudah membuat custom hook `useFastsetWallet` untuk kemudahan integrasi:

```javascript
import { useFastsetWallet } from './hooks/useFastsetWallet';

function MyComponent() {
  const {
    account,
    address,
    isConnected,
    isInstalled,
    isConnecting,
    error,
    connect,
    disconnect,
    getBalance,
    signTransaction,
    sendTransaction,
    formatAddress,
    addressToBytes,
  } = useFastsetWallet();

  const handleConnect = async () => {
    const success = await connect();
    if (success) {
      console.log('Connected:', address);
    }
  };

  return (
    <div>
      {!isInstalled && (
        <div>Please install Fastset Wallet</div>
      )}

      {isInstalled && !isConnected && (
        <button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      )}

      {isConnected && (
        <div>
          <p>Connected: {formatAddress(address)}</p>
          <button onClick={disconnect}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
```

### Hook API

#### State

| Property | Type | Description |
|----------|------|-------------|
| `account` | `Object` | Current account object |
| `address` | `Array<number>` | Account address (32 bytes) |
| `isConnected` | `boolean` | Connection status |
| `isInstalled` | `boolean` | Wallet installation status |
| `isConnecting` | `boolean` | Connection in progress |
| `error` | `string` | Error message if any |

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `connect()` | - | `Promise<boolean>` | Connect to wallet |
| `disconnect()` | - | `Promise<boolean>` | Disconnect from wallet |
| `getBalance(tokenId?)` | `tokenId?: Array<number>` | `Promise<string>` | Get token balance |
| `signTransaction(tx)` | `tx: Transaction` | `Promise<Array<number>>` | Sign transaction |
| `sendTransaction(tx)` | `tx: Transaction` | `Promise<Object>` | Send transaction |
| `formatAddress(addr?)` | `addr?: Array<number>` | `string` | Format address for display |
| `addressToBytes(addr?)` | `addr?: string \| Array<number>` | `Array<number>` | Convert address to bytes |

## Wallet API Reference

### Methods

#### `fastset_requestAccounts`

Request user to connect wallet.

**Request**:
```javascript
await window.fastset.request({
  method: 'fastset_requestAccounts'
});
```

**Response**:
```javascript
[
  {
    address: [117, 241, 196, ...], // 32 bytes
    publicKey: "0x75f1c4...",
    name: "Account 1"
  }
]
```

#### `fastset_accounts`

Get currently connected accounts.

**Request**:
```javascript
await window.fastset.request({
  method: 'fastset_accounts'
});
```

**Response**: Same as `fastset_requestAccounts`

#### `fastset_signTransaction`

Sign a transaction.

**Request**:
```javascript
await window.fastset.request({
  method: 'fastset_signTransaction',
  params: {
    transaction: {
      sender: Array<number>,      // 32 bytes
      recipient: Array<number>,   // 32 bytes
      nonce: number,
      timestamp_nanos: bigint,
      claim: Object
    }
  }
});
```

**Response**:
```javascript
[/* 64 bytes signature */]
```

#### `fastset_sendTransaction`

Sign and send transaction.

**Request**:
```javascript
await window.fastset.request({
  method: 'fastset_sendTransaction',
  params: {
    transaction: {...}
  }
});
```

**Response**:
```javascript
{
  txHash: "0x...",
  status: "success"
}
```

#### `fastset_getBalance`

Get token balance.

**Request**:
```javascript
await window.fastset.request({
  method: 'fastset_getBalance',
  params: {
    address: Array<number>,      // 32 bytes
    tokenId: Array<number> | null // 32 bytes or null for all
  }
});
```

**Response**:
```javascript
{
  balance: "1000000000",
  tokenId: [250, 87, 94, ...]
}
```

### Events

#### `accountsChanged`

Fired when user switches account.

```javascript
window.fastset.on('accountsChanged', (accounts) => {
  // accounts: Array<Account>
});
```

#### `disconnect`

Fired when user disconnects wallet.

```javascript
window.fastset.on('disconnect', () => {
  // Handle disconnect
});
```

#### `chainChanged`

Fired when user switches chain (if multi-chain).

```javascript
window.fastset.on('chainChanged', (chainId) => {
  // chainId: string
});
```

## Error Handling

### Common Errors

```javascript
try {
  await window.fastset.request({
    method: 'fastset_requestAccounts'
  });
} catch (error) {
  if (error.code === 4001) {
    // User rejected the request
    console.log('User rejected connection');
  } else if (error.code === -32002) {
    // Request already pending
    console.log('Connection request already pending');
  } else if (error.code === -32603) {
    // Internal error
    console.log('Internal wallet error');
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| 4001 | User rejected the request |
| 4100 | Unauthorized (not connected) |
| 4200 | Unsupported method |
| 4900 | Disconnected |
| -32002 | Request already pending |
| -32603 | Internal error |

## Best Practices

### 1. Check Installation First

```javascript
useEffect(() => {
  const checkWallet = () => {
    const installed = typeof window.fastset !== 'undefined';
    if (!installed) {
      // Show install prompt
    }
  };

  // Check immediately
  checkWallet();

  // Check again after delay (wallet might load later)
  setTimeout(checkWallet, 1000);
}, []);
```

### 2. Handle Connection State

```javascript
const [isConnecting, setIsConnecting] = useState(false);

const connect = async () => {
  if (isConnecting) return; // Prevent double-click
  
  setIsConnecting(true);
  try {
    const accounts = await window.fastset.request({
      method: 'fastset_requestAccounts'
    });
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setIsConnecting(false);
  }
};
```

### 3. Listen for Events

```javascript
useEffect(() => {
  if (!window.fastset) return;

  const handleAccountsChanged = (accounts) => {
    // Update state
  };

  const handleDisconnect = () => {
    // Clear state
  };

  window.fastset.on('accountsChanged', handleAccountsChanged);
  window.fastset.on('disconnect', handleDisconnect);

  return () => {
    window.fastset.removeListener('accountsChanged', handleAccountsChanged);
    window.fastset.removeListener('disconnect', handleDisconnect);
  };
}, []);
```

### 4. Format Address for Display

```javascript
const formatAddress = (address) => {
  if (Array.isArray(address)) {
    const hex = address.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
  }
  return address;
};
```

### 5. Handle Transaction Errors

```javascript
const sendTransaction = async (tx) => {
  try {
    const result = await window.fastset.request({
      method: 'fastset_sendTransaction',
      params: { transaction: tx }
    });
    
    // Wait for confirmation
    await waitForConfirmation(result.txHash);
    
    return result;
  } catch (error) {
    if (error.code === 4001) {
      // User rejected
      throw new Error('Transaction rejected by user');
    } else {
      // Other error
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }
};
```

## Testing

### Local Testing

1. Install Fastset Wallet Extension
2. Create test account
3. Get test tokens from faucet
4. Test connection and transactions

### Mock Wallet for Testing

```javascript
// Mock wallet for testing without extension
if (process.env.NODE_ENV === 'test') {
  window.fastset = {
    request: async ({ method, params }) => {
      if (method === 'fastset_requestAccounts') {
        return [{
          address: [117, 241, 196, ...],
          publicKey: "0x75f1c4...",
          name: "Test Account"
        }];
      }
      // Mock other methods
    },
    on: (event, callback) => {
      // Mock event listener
    }
  };
}
```

## Migration from Manual Input

Jika Anda sebelumnya menggunakan manual address input, migration mudah:

### Before (Manual Input)

```javascript
const [address, setAddress] = useState(null);

const handleConnect = () => {
  const input = prompt('Enter address:');
  setAddress(JSON.parse(input));
};
```

### After (Wallet Extension)

```javascript
import { useFastsetWallet } from './hooks/useFastsetWallet';

const { address, connect } = useFastsetWallet();

const handleConnect = async () => {
  await connect(); // Wallet popup handles input
};
```

## Troubleshooting

### Wallet Not Detected

```javascript
// Wait for wallet to load
const waitForWallet = (timeout = 3000) => {
  return new Promise((resolve) => {
    if (window.fastset) {
      resolve(true);
      return;
    }

    const interval = setInterval(() => {
      if (window.fastset) {
        clearInterval(interval);
        resolve(true);
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      resolve(false);
    }, timeout);
  });
};

const isInstalled = await waitForWallet();
```

### Connection Fails

1. Check if wallet is unlocked
2. Check if site is allowed in wallet settings
3. Try disconnect and reconnect
4. Clear browser cache

### Transaction Fails

1. Check account has sufficient balance
2. Check nonce is correct
3. Check transaction format
4. Check network connection

## Resources

- [Fastset Wallet Chrome Store](https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe)
- [Fastset Documentation](https://docs.pi2.network)
- [Wallet Demo](https://wallet.fastset.xyz)
- [OmniSet Portal](https://omniset.fastset.xyz)

## Support

Jika ada masalah dengan integrasi wallet:

1. Check browser console untuk errors
2. Verify wallet extension is installed dan unlocked
3. Check network connection
4. Consult Fastset documentation
5. Create issue di GitHub repository

---

**Version**: 1.0.0  
**Last Updated**: March 2, 2026  
**Compatible with**: Fastset Wallet Extension v1.0.4+
