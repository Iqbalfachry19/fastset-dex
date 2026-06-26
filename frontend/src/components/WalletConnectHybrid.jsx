import { useState, useEffect } from 'react';
import { useFastsetWallet } from '../hooks/useFastsetWallet';
import { dexApi } from '../utils/api';
import { fastsetWallet } from '../utils/fastsetWallet';
import { TOKENS, formatTokenAmount } from '../utils/tokens';

const NATIVE_DECIMALS = 18;
const NATIVE_SYMBOL = 'SET';
const SET_DISPLAY_DECIMALS = 2;

export default function WalletConnectHybrid({ onAddressChange, refreshKey = 0 }) {
  const {
    account,
    address: walletAddress,
    isConnected: walletConnected,
    isInstalled,
    isConnecting,
    error: walletError,
    connect: connectWallet,
    disconnect: disconnectWallet,
    formatAddress,
    walletInfo,
  } = useFastsetWallet();

  // Manual mode state
  const [manualMode, setManualMode] = useState(false);
  const [manualAddress, setManualAddress] = useState(null);
  const [showManualModal, setShowManualModal] = useState(false);
  const [inputAddress, setInputAddress] = useState('');
  const [manualError, setManualError] = useState(null);
  const [balances, setBalances] = useState({ NATIVE: '0', USDC: '0', ETH: '0' });
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState(null);

  const normalizeAmount = (rawAmount) => {
    if (rawAmount === null || rawAmount === undefined) return '0';
    if (typeof rawAmount === 'number' || typeof rawAmount === 'bigint') return rawAmount.toString();
    if (typeof rawAmount !== 'string') return '0';

    const value = rawAmount.trim();
    if (!value || value === '0') return '0';

    try {
      // Handles: 0x..., -0x..., 123, -123, abc, -abc
      const isNegative = value.startsWith('-');
      const absValue = isNegative ? value.slice(1) : value;
      const cleanAbsValue = absValue.startsWith('0x') ? absValue : `0x${absValue}`;

      // We use BigInt with 0x prefix to force hex parsing for the new API
      // If the API returns decimal, this might be tricky, but newest spec is all hex.
      const bigint = BigInt(cleanAbsValue);
      return isNegative ? `-${bigint.toString()}` : bigint.toString();
    } catch (err) {
      // Fallback to decimal if hex parsing fails
      if (/^-?[0-9]+$/.test(value)) return value;
      return '0';
    }
  };

  const formatSetDisplayAmount = (amount) => {
    const formatted = formatTokenAmount(amount, NATIVE_DECIMALS);
    const [integerPart, fractionalPart = ''] = formatted.split('.');

    if (!fractionalPart) {
      return integerPart;
    }

    return `${integerPart}.${fractionalPart.slice(0, SET_DISPLAY_DECIMALS)}`;
  };

  const normalizeAddressForApi = (rawAddress) => {
    if (!rawAddress) return null;
    if (Array.isArray(rawAddress) && rawAddress.length === 32) return rawAddress;
    if (Array.isArray(rawAddress.address) && rawAddress.address.length === 32) return rawAddress.address;
    if (Array.isArray(rawAddress.sender) && rawAddress.sender.length === 32) return rawAddress.sender;
    if (Array.isArray(rawAddress.Address32) && rawAddress.Address32.length === 32) return rawAddress.Address32;
    if (Array.isArray(rawAddress.address32) && rawAddress.address32.length === 32) return rawAddress.address32;
    if (typeof rawAddress === 'string') return rawAddress;
    if (typeof rawAddress.address === 'string') return rawAddress.address;
    if (typeof rawAddress.sender === 'string') return rawAddress.sender;
    return null;
  };

  const resolveBalanceAddress = async () => {
    const directAddress = normalizeAddressForApi(address) || normalizeAddressForApi(account);
    if (Array.isArray(directAddress) && directAddress.length === 32) {
      return directAddress;
    }

    // If current state keeps bech32/string address, force-read canonical account bytes from wallet API.
    try {
      const accounts = await fastsetWallet.getAccounts();
      if (accounts && accounts.length > 0) {
        const walletAddr = normalizeAddressForApi(accounts[0]);
        if (Array.isArray(walletAddr) && walletAddr.length === 32) {
          return walletAddr;
        }
      }
    } catch (error) {
      console.log('Unable to refresh address bytes from wallet:', error);
    }

    return directAddress;
  };

  // Determine which mode is active
  const isConnected = walletConnected || manualAddress !== null;
  const address = walletConnected ? walletAddress : manualAddress;

  useEffect(() => {
    if (typeof onAddressChange === 'function') {
      onAddressChange(address || null);
    }
  }, [address, onAddressChange]);

  // Auto-switch to manual mode if wallet not installed after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isInstalled && !manualMode) {
        console.log('Fastset Wallet not detected, enabling manual mode');
        setManualMode(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [isInstalled, manualMode]);

  const handleConnectWallet = async () => {
    const success = await connectWallet();
    if (!success && walletError) {
      console.error('Connection failed:', walletError);
    }
  };

  const handleDisconnectWallet = async () => {
    await disconnectWallet();
  };

  const handleConnectManual = () => {
    if (!inputAddress) return;

    try {
      const addressArray = JSON.parse(inputAddress);
      if (Array.isArray(addressArray) && addressArray.length === 32) {
        setManualAddress(addressArray);
        setShowManualModal(false);
        setInputAddress('');
        setManualError(null);
        // Save to localStorage
        localStorage.setItem('manualWalletAddress', JSON.stringify(addressArray));
      } else {
        setManualError('Invalid address format. Must be a 32-byte array.');
      }
    } catch (err) {
      setManualError('Invalid address format. Use JSON array format.');
    }
  };

  const handleDisconnectManual = () => {
    setManualAddress(null);
    localStorage.removeItem('manualWalletAddress');
  };

  const openWalletDownload = () => {
    window.open(walletInfo?.downloadUrl || 'https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe', '_blank');
  };

  const switchToManualMode = () => {
    setManualMode(true);
  };

  // Load manual address from localStorage on mount
  useEffect(() => {
    const savedAddress = localStorage.getItem('manualWalletAddress');
    if (savedAddress && !walletConnected) {
      try {
        setManualAddress(JSON.parse(savedAddress));
      } catch (err) {
        console.error('Error loading saved address:', err);
      }
    }
  }, [walletConnected]);

  // Load account balances when connected
  useEffect(() => {
    const loadBalances = async () => {
      if (!isConnected || !address) {
        setBalances({ NATIVE: '0', USDC: '0' });
        setBalanceError(null);
        return;
      }

      try {
        setBalanceLoading(true);
        setBalanceError(null);

        const balanceAddress = await resolveBalanceAddress();
        if (!balanceAddress) {
          throw new Error('Address is not available to fetch balance');
        }

        const response = await dexApi.getAccountInfo(balanceAddress);
        const accountInfo = response?.data || response;
        const tokenBalances = accountInfo?.token_balance || accountInfo?.token_balances || accountInfo?.tokenBalances || [];

        const findTokenBalance = (tokenId) => {
          const found = tokenBalances.find((tb) => {
            if (Array.isArray(tb) && tb.length >= 2) {
              return JSON.stringify(tb[0]) === JSON.stringify(tokenId);
            }

            const id = tb?.token_id || tb?.tokenId;
            return id && JSON.stringify(id) === JSON.stringify(tokenId);
          });

          if (Array.isArray(found) && found.length >= 2) {
            return normalizeAmount(found[1]);
          }

          return normalizeAmount(found?.amount || found?.balance || '0');
        };

        setBalances({
          NATIVE: normalizeAmount(accountInfo?.balance),
          USDC: findTokenBalance(TOKENS.USDC.id),
          ETH: findTokenBalance(TOKENS.ETH.id),
        });
      } catch (err) {
        setBalanceError(err.response?.data?.error || err.message);
      } finally {
        setBalanceLoading(false);
      }
    };

    loadBalances();
  }, [isConnected, address, refreshKey]);

  // Format address for display
  const displayAddress = (addr) => {
    if (!addr) return '';
    if (walletConnected) {
      return formatAddress(addr);
    }
    // Manual mode
    const hex = addr.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
  };

  // Connected state (either wallet or manual)
  if (isConnected) {
    return (
      <div className="wallet-connected">
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="info-box" style={{ flex: 1, margin: 0 }}>
            <div className="info-row" style={{ marginBottom: 0 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  display: 'inline-block'
                }}></span>
                {walletConnected ? 'Wallet Connected' : 'Manual Mode'}
              </span>
              <span style={{ fontFamily: 'monospace' }}>
                {displayAddress(address)}
              </span>
            </div>
          </div>

          <button
            className="button secondary"
            onClick={walletConnected ? handleDisconnectWallet : handleDisconnectManual}
            style={{ width: 'auto', padding: '12px 24px' }}
          >
            Disconnect
          </button>
        </div>

        {walletConnected && account && (
          <div style={{
            marginTop: '12px',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>💼</span>
            <span>
              {account.name || 'Account 1'} • Fastset Wallet {walletInfo?.version}
            </span>
          </div>
        )}

        <div style={{
          marginTop: '12px',
          padding: '10px 12px',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          fontSize: '0.85rem'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Balance USDC</span>
            <span>{balanceLoading ? 'Loading...' : formatTokenAmount(balances.USDC, TOKENS.USDC.decimals)}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'var(--text-secondary)' }}>Balance ETH</span>
            <span>{balanceLoading ? 'Loading...' : formatTokenAmount(balances.ETH, TOKENS.ETH.decimals)}</span>
          </div>
          {balanceError && (
            <div style={{ marginTop: '8px', color: 'var(--danger)' }}>
              ⚠️ Failed to fetch balance: {balanceError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not connected - show connection options
  return (
    <div className="wallet-connect">
      {(walletError || manualError) && (
        <div className="alert error" style={{ marginBottom: '20px' }}>
          ⚠️ {walletError || manualError}
        </div>
      )}

      {/* Wallet Extension Mode */}
      {isInstalled && !manualMode && (
        <>
          <button
            className="button"
            onClick={handleConnectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? '🔄 Connecting...' : '🔗 Connect Fastset Wallet'}
          </button>

          <p style={{
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginTop: '12px',
            textAlign: 'center'
          }}>
            Click to connect with Fastset Wallet Extension
          </p>

          <button
            className="button secondary"
            onClick={switchToManualMode}
            style={{ marginTop: '12px' }}
          >
            Or use Manual Mode
          </button>
        </>
      )}

      {/* Manual Mode or Wallet Not Installed */}
      {(!isInstalled || manualMode) && (
        <>
          <div className="card" style={{ marginBottom: '20px' }}>
            <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>
              {!isInstalled ? '⚠️ Fastset Wallet Not Detected' : '📝 Manual Mode'}
            </h3>

            {!isInstalled && (
              <>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                  For the best experience, install Fastset Wallet Extension:
                </p>

                <div className="wallet-features" style={{ marginBottom: '16px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span>✅</span>
                    <span>Non-custodial & secure</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span>✅</span>
                    <span>150K TPS, 0.25ms finality</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>✅</span>
                    <span>70,000+ users, 4.9/5 rating</span>
                  </div>
                </div>

                <button
                  className="button"
                  onClick={openWalletDownload}
                  style={{ marginBottom: '16px' }}
                >
                  📥 Download Fastset Wallet
                </button>

                <div style={{
                  borderTop: '1px solid var(--border)',
                  paddingTop: '16px',
                  marginTop: '16px'
                }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '12px' }}>
                    Or for testing, use manual input:
                  </p>
                </div>
              </>
            )}

            <button
              className="button secondary"
              onClick={() => setShowManualModal(true)}
            >
              {!isInstalled ? '🔧 Use Manual Mode' : '📝 Manual Address Input'}
            </button>
          </div>
        </>
      )}

      {/* Manual Input Modal */}
      {showManualModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '90%' }}>
            <h2 style={{ marginBottom: '20px' }}>Manual Address Input</h2>

            <div className="form-group">
              <label>Address (Format: JSON Array 32 bytes)</label>
              <textarea
                className="input"
                rows="4"
                placeholder='[117,241,196,57,36,138,56,24,124,167,74,151,228,31,165,23,238,229,65,153,0,134,209,9,67,37,98,90,163,204,127,21]'
                value={inputAddress}
                onChange={(e) => setInputAddress(e.target.value)}
              />
            </div>

            {manualError && (
              <div className="alert error">
                ⚠️ {manualError}
              </div>
            )}

            <div className="alert warning">
              ℹ️ Enter address in JSON array format with 32 bytes
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                className="button"
                onClick={handleConnectManual}
                disabled={!inputAddress}
              >
                Connect
              </button>
              <button
                className="button secondary"
                onClick={() => {
                  setShowManualModal(false);
                  setInputAddress('');
                  setManualError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
