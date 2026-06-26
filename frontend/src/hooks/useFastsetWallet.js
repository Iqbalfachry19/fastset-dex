import { useState, useEffect, useCallback } from 'react';
import { fastsetWallet } from '../utils/fastsetWallet';

/**
 * Custom hook for Fastset Wallet integration
 * Similar to the implementation in OmniSet Portal
 */
export const useFastsetWallet = () => {
  const [account, setAccount] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const extractAddress = useCallback((acc) => {
    if (!acc) return null;

    if (Array.isArray(acc)) return acc;
    if (Array.isArray(acc.address)) return acc.address;
    if (Array.isArray(acc.sender)) return acc.sender;
    if (Array.isArray(acc.Address32)) return acc.Address32;
    if (Array.isArray(acc.address32)) return acc.address32;

    if (typeof acc.address === 'string') return acc.address;
    if (typeof acc.sender === 'string') return acc.sender;

    return null;
  }, []);

  // Check wallet installation on mount
  useEffect(() => {
    const checkWallet = () => {
      const installed = fastsetWallet.checkInstalled();
      setIsInstalled(installed);
    };

    // Check immediately
    checkWallet();

    // Check again after delays (wallet might load after page)
    const timer1 = setTimeout(checkWallet, 500);
    const timer2 = setTimeout(checkWallet, 1500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // Check if already connected on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (!isInstalled) return;

      try {
        const accounts = await fastsetWallet.getAccounts();
        if (accounts && accounts.length > 0) {
          const acc = accounts[0];
          const accAddress = extractAddress(acc);
          setAccount(acc);
          setAddress(accAddress);
          setIsConnected(Boolean(accAddress));
          console.log('✅ Already connected:', acc);
        }
      } catch (err) {
        console.log('Not connected yet');
      }
    };

    if (isInstalled) {
      checkConnection();
    }
  }, [isInstalled, extractAddress]);

  // Listen for account changes
  useEffect(() => {
    if (!isInstalled) return;

    const handleAccountsChanged = (acc) => {
      if (acc) {
        const accAddress = extractAddress(acc);
        setAccount(acc);
        setAddress(accAddress);
        setIsConnected(Boolean(accAddress));
        console.log('🔄 Account changed:', acc);
      } else {
        setAccount(null);
        setAddress(null);
        setIsConnected(false);
        console.log('🔌 Disconnected');
      }
    };

    const handleDisconnect = () => {
      setAccount(null);
      setAddress(null);
      setIsConnected(false);
      console.log('🔌 Wallet disconnected');
    };

    fastsetWallet.onAccountsChanged(handleAccountsChanged);
    fastsetWallet.onDisconnect(handleDisconnect);
  }, [isInstalled, extractAddress]);

  // Connect wallet - similar to "Connect Fastset Wallet" in OmniSet
  const connect = useCallback(async () => {
    if (!isInstalled) {
      const errorMsg = 'Fastset Wallet Extension is not installed. Please install it first.';
      setError(errorMsg);
      console.error('❌', errorMsg);
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      console.log('🔗 Connecting to Fastset Wallet...');
      const acc = await fastsetWallet.connect();
      const accAddress = extractAddress(acc);
      if (!accAddress) {
        throw new Error('Account address was not found in wallet response');
      }
      
      setAccount(acc);
      setAddress(accAddress);
      setIsConnected(true);
      console.log('✅ Connected successfully:', acc);
      
      return true;
    } catch (err) {
      console.error('❌ Connection failed:', err);
      
      let errorMsg = err.message;
      if (err.code === 4001) {
        errorMsg = 'User rejected the connection request';
      } else if (err.code === -32002) {
        errorMsg = 'Connection request already pending, check wallet popup';
      }
      
      setError(errorMsg);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isInstalled]);

  // Disconnect wallet
  const disconnect = useCallback(async () => {
    try {
      await fastsetWallet.disconnect();
      setAccount(null);
      setAddress(null);
      setIsConnected(false);
      setError(null);
      console.log('✅ Disconnected successfully');
      return true;
    } catch (err) {
      console.error('❌ Disconnect failed:', err);
      setError(err.message);
      return false;
    }
  }, []);

  // Get balance
  const getBalance = useCallback(async (addr) => {
    if (!isConnected && !addr) {
      throw new Error('Wallet is not connected');
    }

    try {
      return await fastsetWallet.getBalance(addr || address);
    } catch (err) {
      console.error('Error getting balance:', err);
      throw err;
    }
  }, [isConnected, address]);

  // Sign transaction
  const signTransaction = useCallback(async (transaction) => {
    if (!isConnected) {
      throw new Error('Wallet is not connected');
    }

    try {
      return await fastsetWallet.signTransaction(transaction);
    } catch (err) {
      console.error('Error signing transaction:', err);
      throw err;
    }
  }, [isConnected]);

  // Send transaction
  const sendTransaction = useCallback(async (transaction) => {
    if (!isConnected) {
      throw new Error('Wallet is not connected');
    }

    try {
      return await fastsetWallet.sendTransaction(transaction);
    } catch (err) {
      console.error('Error sending transaction:', err);
      throw err;
    }
  }, [isConnected]);

  // Format address
  const formatAddress = useCallback((addr) => {
    return fastsetWallet.formatAddress(addr || address);
  }, [address]);

  // Convert address to bytes
  const addressToBytes = useCallback((addr) => {
    return fastsetWallet.addressToBytes(addr || address);
  }, [address]);

  return {
    // State
    account,
    address,
    isConnected,
    isInstalled,
    isConnecting,
    error,

    // Methods
    connect,
    disconnect,
    getBalance,
    signTransaction,
    sendTransaction,
    formatAddress,
    addressToBytes,

    // Wallet info
    walletInfo: fastsetWallet.getWalletInfo(),
  };
};

export default useFastsetWallet;
