import { useState, useEffect } from 'react';

export const useWallet = () => {
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const savedAddress = localStorage.getItem('walletAddress');
    if (savedAddress) {
      setAddress(JSON.parse(savedAddress));
      setIsConnected(true);
    }
  }, []);

  const connect = (walletAddress) => {
    setAddress(walletAddress);
    setIsConnected(true);
    localStorage.setItem('walletAddress', JSON.stringify(walletAddress));
  };

  const disconnect = () => {
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem('walletAddress');
  };

  return {
    address,
    isConnected,
    connect,
    disconnect,
  };
};
