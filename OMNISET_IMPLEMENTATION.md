# OmniSet-Style Wallet Implementation

Dokumentasi implementasi wallet connection yang mirip dengan [OmniSet Portal](https://omniset.fastset.xyz/).

## Overview

Implementasi ini mengikuti pattern yang sama dengan OmniSet Portal untuk wallet connection:

1. **Detect Wallet Extension** - Check `window.fastset` object
2. **Connect Button** - User klik "Connect Fastset Wallet"
3. **Wallet Popup** - Extension show popup untuk approval
4. **Auto-Connect** - Reconnect otomatis jika sudah pernah connect
5. **Fallback Mode** - Manual input jika wallet tidak terinstall

## Architecture

### 1. Wallet Detection

```javascript
// Check if Fastset Wallet Extension is installed
const isInstalled = typeof window !== 'undefined' && typeof window.fastset !== 'undefined';

if (isInstalled) {
  console.log('✅ Fastset Wallet detected');
  wallet = window.fastset;
}
```

### 2. Connection Flow (Mirip OmniSet)

```javascript
// User clicks "Connect Fastset Wallet"
const connect = async () => {
  try {
    // This will trigger wallet popup
    const accounts = await window.fastset.connect();
    
    if (accounts && accounts.length > 0) {
      const account = accounts[0];
      // account structure:
      // {
      //   address: [117, 241, 196, ...], // 32 bytes array
      //   publicKey: "0x75f1c4...",
      //   name: "Account 1"
      // }
      
      setAccount(account);
      setConnected(true);
    }
  } catch (error) {
    if (error.code === 4001) {
      // User rejected connection
      console.log('User rejected');
    }
  }
};
```

### 3. Auto-Reconnect

```javascript
// On page load, check if already connected
useEffect(() => {
  const checkConnection = async () => {
    try {
      // Get accounts without triggering popup
      const accounts = await window.fastset.getAccounts();
      
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0]);
        setConnected(true);
      }
    } catch (error) {
      // Not connected yet
    }
  };
  
  checkConnection();
}, []);
```

### 4. Event Listeners

```javascript
// Listen for account changes
window.fastset.on('accountsChanged', (accounts) => {
  if (accounts && accounts.length > 0) {
    setAccount(accounts[0]);
  } else {
    setAccount(null);
  }
});

// Listen for disconnect
window.fastset.on('disconnect', () => {
  setAccount(null);
  setConnected(false);
});
```

## Implementation Files

### Core Files

1. **`frontend/src/utils/fastsetWallet.js`**
   - Wrapper class untuk `window.fastset` API
   - Methods: `connect()`, `getAccounts()`, `signTransaction()`, dll
   - Event handling: `onAccountsChanged()`, `onDisconnect()`

2. **`frontend/src/hooks/useFastsetWallet.js`**
   - Custom React hook
   - State management: account, address, isConnected, isInstalled
   - Auto-detection dan auto-reconnect

3. **`frontend/src/components/WalletConnectHybrid.jsx`**
   - UI component untuk wallet connection
   - Support dual mode: Extension + Manual
   - Mirip dengan "Manage Wallet" di OmniSet

## UI Flow (Mirip OmniSet)

### State 1: Wallet Not Installed

```
┌─────────────────────────────────────┐
│  ⚠️ Fastset Wallet Tidak Terdeteksi │
│                                     │
│  Install Fastset Wallet Extension: │
│  ✅ Non-custodial & secure         │
│  ✅ 150K TPS, 0.25ms finality      │
│  ✅ 70,000+ users, 4.9/5 rating    │
│                                     │
│  [📥 Download Fastset Wallet]      │
│                                     │
│  ─────────────────────────────────  │
│  Atau untuk testing:                │
│  [🔧 Gunakan Manual Mode]          │
└─────────────────────────────────────┘
```

### State 2: Wallet Installed, Not Connected

```
┌─────────────────────────────────────┐
│  [🔗 Connect Fastset Wallet]       │
│                                     │
│  Klik untuk connect dengan          │
│  Fastset Wallet Extension           │
│                                     │
│  [📝 Atau gunakan Manual Mode]     │
└─────────────────────────────────────┘
```

### State 3: Connected

```
┌─────────────────────────────────────┐
│  🟢 Wallet Terhubung                │
│  Address: 0x75f1c4...cc7f15         │
│                                     │
│  💼 Account 1 • Fastset Wallet 1.0 │
│                                     │
│  [Putuskan]                         │
└─────────────────────────────────────┘
```

## Comparison with OmniSet

| Feature | OmniSet | Our Implementation | Status |
|---------|---------|-------------------|--------|
| Wallet Detection | ✅ | ✅ | ✅ Sama |
| Connect Button | ✅ | ✅ | ✅ Sama |
| Popup Approval | ✅ | ✅ | ✅ Sama |
| Auto-Reconnect | ✅ | ✅ | ✅ Sama |
| Account Display | ✅ | ✅ | ✅ Sama |
| Disconnect | ✅ | ✅ | ✅ Sama |
| Event Listeners | ✅ | ✅ | ✅ Sama |
| Manual Fallback | ❌ | ✅ | ✅ Extra |

## API Methods Used

### window.fastset.connect()

Trigger wallet popup untuk connection approval.

**Usage:**
```javascript
const accounts = await window.fastset.connect();
```

**Returns:**
```javascript
[
  {
    address: [117, 241, 196, ...], // 32 bytes
    publicKey: "0x75f1c4...",
    name: "Account 1"
  }
]
```

### window.fastset.getAccounts()

Get currently connected accounts tanpa trigger popup.

**Usage:**
```javascript
const accounts = await window.fastset.getAccounts();
```

**Returns:** Same as `connect()`

### window.fastset.signTransaction()

Sign transaction dengan wallet.

**Usage:**
```javascript
const signature = await window.fastset.signTransaction(transaction);
```

**Returns:** `[/* 64 bytes signature */]`

### window.fastset.sendTransaction()

Sign dan send transaction.

**Usage:**
```javascript
const result = await window.fastset.sendTransaction(transaction);
```

**Returns:**
```javascript
{
  txHash: "0x...",
  status: "success"
}
```

### window.fastset.on()

Listen untuk events.

**Events:**
- `accountsChanged`: Account berubah
- `disconnect`: Wallet disconnect
- `chainChanged`: Chain berubah (jika multi-chain)

**Usage:**
```javascript
window.fastset.on('accountsChanged', (accounts) => {
  console.log('Account changed:', accounts);
});
```

## Testing

### With Fastset Wallet Extension

1. Install extension dari [Chrome Web Store](https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe)
2. Create atau import wallet
3. Visit `http://localhost:3002`
4. Click "Connect Fastset Wallet"
5. Approve di popup wallet
6. ✅ Connected!

### Without Extension (Manual Mode)

1. Visit `http://localhost:3002`
2. Click "Gunakan Manual Mode"
3. Paste address dalam format JSON array:
   ```json
   [117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]
   ```
4. Click "Hubungkan"
5. ✅ Connected!

## Error Handling

### Common Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| 4001 | User rejected connection | User harus approve di popup |
| -32002 | Request already pending | Check popup wallet yang sudah terbuka |
| -32603 | Internal error | Restart extension atau browser |
| 4100 | Unauthorized | Wallet belum connected |

### Error Messages

```javascript
try {
  await window.fastset.connect();
} catch (error) {
  if (error.code === 4001) {
    console.log('User menolak koneksi');
  } else if (error.code === -32002) {
    console.log('Request sudah pending, check popup wallet');
  } else {
    console.error('Error:', error.message);
  }
}
```

## Best Practices

### 1. Check Installation First

```javascript
useEffect(() => {
  const checkWallet = () => {
    const installed = typeof window.fastset !== 'undefined';
    setIsInstalled(installed);
  };

  checkWallet();
  setTimeout(checkWallet, 500);  // Check again after delay
  setTimeout(checkWallet, 1500); // And again
}, []);
```

### 2. Auto-Reconnect on Mount

```javascript
useEffect(() => {
  if (!isInstalled) return;

  const checkConnection = async () => {
    const accounts = await window.fastset.getAccounts();
    if (accounts.length > 0) {
      setAccount(accounts[0]);
      setConnected(true);
    }
  };

  checkConnection();
}, [isInstalled]);
```

### 3. Listen for Events

```javascript
useEffect(() => {
  if (!isInstalled) return;

  const handleAccountsChanged = (accounts) => {
    setAccount(accounts[0] || null);
  };

  const handleDisconnect = () => {
    setAccount(null);
    setConnected(false);
  };

  window.fastset.on('accountsChanged', handleAccountsChanged);
  window.fastset.on('disconnect', handleDisconnect);

  return () => {
    window.fastset.removeListener('accountsChanged', handleAccountsChanged);
    window.fastset.removeListener('disconnect', handleDisconnect);
  };
}, [isInstalled]);
```

### 4. Handle Connection State

```javascript
const [isConnecting, setIsConnecting] = useState(false);

const connect = async () => {
  if (isConnecting) return; // Prevent double-click
  
  setIsConnecting(true);
  try {
    const accounts = await window.fastset.connect();
    setAccount(accounts[0]);
    setConnected(true);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    setIsConnecting(false);
  }
};
```

## Differences from MetaMask

| Feature | MetaMask | Fastset Wallet |
|---------|----------|----------------|
| API Object | `window.ethereum` | `window.fastset` |
| Connect Method | `request({method: 'eth_requestAccounts'})` | `connect()` |
| Get Accounts | `request({method: 'eth_accounts'})` | `getAccounts()` |
| Sign Transaction | `request({method: 'eth_signTransaction'})` | `signTransaction()` |
| Event Prefix | `accountsChanged` | `accountsChanged` |

## Security Considerations

1. **Never Store Private Keys**: Extension handles all keys
2. **User Approval Required**: Every connection needs approval
3. **Popup Validation**: Always check for popup blockers
4. **Event Validation**: Validate account changes
5. **Error Handling**: Handle all error cases gracefully

## Troubleshooting

### Wallet Not Detected

**Problem**: `window.fastset` is undefined

**Solutions:**
1. Check extension is installed
2. Check extension is enabled
3. Refresh page
4. Wait for extension to load (use setTimeout)
5. Check browser console for errors

### Connection Fails

**Problem**: `connect()` throws error

**Solutions:**
1. Check wallet is unlocked
2. Check popup is not blocked
3. Check network connection
4. Try disconnect and reconnect
5. Restart extension

### Auto-Reconnect Not Working

**Problem**: `getAccounts()` returns empty array

**Solutions:**
1. Check if previously connected
2. Check wallet permissions
3. Clear browser cache
4. Reconnect manually

## Resources

- [OmniSet Portal](https://omniset.fastset.xyz/) - Live example
- [Fastset Wallet Extension](https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe) - Chrome Web Store
- [Fastset Documentation](https://docs.pi2.network) - Official docs
- [Wallet Demo](https://wallet.fastset.xyz) - Test wallet

## Summary

Implementasi ini mengikuti pattern yang sama dengan OmniSet Portal:

✅ **Detection**: Auto-detect `window.fastset`  
✅ **Connection**: One-click connect dengan popup approval  
✅ **Auto-Reconnect**: Reconnect otomatis saat reload  
✅ **Events**: Listen untuk account changes dan disconnect  
✅ **Fallback**: Manual mode untuk testing tanpa extension  
✅ **Error Handling**: Comprehensive error messages  
✅ **UX**: Clean UI mirip OmniSet  

---

**Version**: 1.0.0  
**Last Updated**: March 2, 2026  
**Based on**: OmniSet Portal Implementation
