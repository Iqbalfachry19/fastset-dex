/**
 * Fastset Wallet Integration
 * Implementation based on OmniSet patterns and wallet extension standards
 */
import { dexApi } from './api';

export class FastsetWallet {
  constructor() {
    this.wallet = null;
    this.isInstalled = false;
    this.account = null;
  }

  hasWalletMethods(candidate) {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    const methods = ['request', 'send', 'sendAsync', 'connect', 'getAccounts', 'sendTransaction', 'signTransaction', 'submitTransaction'];
    return methods.some((method) => typeof candidate[method] === 'function');
  }

  getProviderCandidates() {
    if (typeof window === 'undefined' || typeof window.fastset === 'undefined') {
      return [];
    }

    const root = window.fastset;
    const candidates = [
      root,
      root.provider,
      root.wallet,
      root.fastset,
      root.experimental?.provider,
      root.ethereum
    ].filter(Boolean);

    const unique = [];
    for (const candidate of candidates) {
      if (!unique.includes(candidate)) {
        unique.push(candidate);
      }
    }

    return unique;
  }

  getProviderScore(candidate) {
    if (!candidate || typeof candidate !== 'object') return -1;

    let score = 0;
    if (typeof candidate.request === 'function') score += 8;
    if (typeof candidate.send === 'function') score += 7;
    if (typeof candidate.sendAsync === 'function') score += 6;
    if (typeof candidate.sendTransaction === 'function') score += 5;
    if (typeof candidate.submitTransaction === 'function') score += 4;
    if (typeof candidate.signTransaction === 'function') score += 3;
    if (typeof candidate.getAccounts === 'function') score += 2;
    if (typeof candidate.connect === 'function') score += 1;
    return score;
  }

  async invokeRpc(provider, method, params) {
    if (!provider) {
      throw new Error('Provider unavailable');
    }

    if (typeof provider[method] === 'function') {
      return provider[method](params);
    }

    if (typeof provider.request === 'function') {
      return provider.request({ method, params });
    }

    if (typeof provider.send === 'function') {
      try {
        const direct = await provider.send(method, params);
        if (direct && typeof direct === 'object' && 'result' in direct) {
          return direct.result;
        }
        return direct;
      } catch (_) {
        const payload = { jsonrpc: '2.0', id: Date.now(), method, params };
        const viaPayload = await provider.send(payload);
        if (viaPayload && typeof viaPayload === 'object' && 'result' in viaPayload) {
          return viaPayload.result;
        }
        return viaPayload;
      }
    }

    if (typeof provider.sendAsync === 'function') {
      const payload = { jsonrpc: '2.0', id: Date.now(), method, params };
      return await new Promise((resolve, reject) => {
        provider.sendAsync(payload, (error, response) => {
          if (error) return reject(error);
          if (response?.error) return reject(response.error);
          resolve(response?.result ?? response);
        });
      });
    }

    throw new Error('Provider has no RPC method (request/send/sendAsync)');
  }

  bytesToHex(value, withPrefix = true) {
    if (!Array.isArray(value)) return '';
    const hex = value.map((b) => Number(b).toString(16).padStart(2, '0')).join('');
    return withPrefix ? `0x${hex}` : hex;
  }

  async tryClaimOrTransferApi(provider, transaction) {
    if (!provider || !transaction?.claim) return null;

    if (transaction.claim.ExternalClaim) {
      const claim = transaction.claim.ExternalClaim?.claim || {};
      const preferredRecipient = typeof transaction.recipient_display === 'string' && transaction.recipient_display.trim()
        ? transaction.recipient_display.trim()
        : null;
      const params = {
        claimData: claim.claim_data || [],
        recipient: preferredRecipient || (Array.isArray(transaction.recipient)
          ? this.bytesToHex(transaction.recipient, true)
          : transaction.recipient),
        verifierCommittee: claim.verifier_committee || [],
        verifierQuorum: claim.verifier_quorum ?? 0,
        signatures: transaction.claim.ExternalClaim?.signatures || []
      };

      const attempts = [
        () => this.invokeRpc(provider, 'submitClaim', params),
        () => this.invokeRpc(provider, 'submitClaim', [params]),
        () => this.invokeRpc(provider, 'fastset_submitClaim', params),
        () => this.invokeRpc(provider, 'fastset_submitClaim', [params])
      ];

      let lastError = null;
      for (const run of attempts) {
        try {
          return await run();
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) throw lastError;
    }

    if (transaction.claim.TokenTransfer) {
      const transfer = transaction.claim.TokenTransfer;
      const preferredRecipient = typeof transaction.recipient_display === 'string' && transaction.recipient_display.trim()
        ? transaction.recipient_display.trim()
        : null;
      const recipient = preferredRecipient || (Array.isArray(transaction.recipient)
        ? this.bytesToHex(transaction.recipient, true)
        : transaction.recipient);
      const tokenIdHexNoPrefix = Array.isArray(transfer.token_id)
        ? this.bytesToHex(transfer.token_id, false)
        : String(transfer.token_id || '');
      const tokenIdHex = tokenIdHexNoPrefix ? `0x${tokenIdHexNoPrefix}` : tokenIdHexNoPrefix;

      const amountRaw = String(transfer.amount ?? '');
      let amountDecimal = amountRaw;
      if (/^[0-9a-fA-F]+$/.test(amountRaw) && /[a-fA-F]/.test(amountRaw)) {
        amountDecimal = BigInt(`0x${amountRaw}`).toString();
      }

      const transferParamVariants = [
        { amount: amountDecimal, recipient, tokenId: tokenIdHexNoPrefix },
        { amount: amountDecimal, recipient, tokenId: tokenIdHex },
        { amount: amountRaw, recipient, tokenId: tokenIdHexNoPrefix }
      ];

      let lastError = null;
      for (const params of transferParamVariants) {
        const attempts = [
          () => this.invokeRpc(provider, 'transfer', params),
          () => this.invokeRpc(provider, 'transfer', [params]),
          () => this.invokeRpc(provider, 'fastset_transfer', params),
          () => this.invokeRpc(provider, 'fastset_transfer', [params])
        ];

        for (const run of attempts) {
          try {
            return await run();
          } catch (error) {
            lastError = error;
          }
        }
      }
      if (lastError) throw lastError;
    }

    return null;
  }

  resolveWalletProvider() {
    const candidates = this.getProviderCandidates();
    if (candidates.length === 0) return null;

    let best = null;
    let bestScore = -1;
    for (const candidate of candidates) {
      if (!this.hasWalletMethods(candidate)) continue;
      const score = this.getProviderScore(candidate);
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
      }
    }

    return best;
  }

  normalizeAccounts(rawAccounts) {
    if (Array.isArray(rawAccounts)) {
      return rawAccounts.filter(Boolean);
    }

    if (!rawAccounts || typeof rawAccounts !== 'object') {
      return [];
    }

    if (Array.isArray(rawAccounts.accounts)) {
      return rawAccounts.accounts.filter(Boolean);
    }

    if (rawAccounts.account && typeof rawAccounts.account === 'object') {
      return [rawAccounts.account];
    }

    if (rawAccounts.address) {
      return [rawAccounts];
    }

    return [];
  }

  getPrimaryAccount(accounts) {
    if (!Array.isArray(accounts)) {
      return null;
    }

    return accounts.find((acc) => {
      if (!acc || typeof acc !== 'object') return false;
      if (Array.isArray(acc.address)) return acc.address.length > 0;
      if (typeof acc.address === 'string') return acc.address.length > 0;
      return false;
    }) || null;
  }

  async readAccountsFromWallet() {
    let accounts = null;

    if (typeof this.wallet.getAccounts === 'function') {
      accounts = await this.wallet.getAccounts();
    } else if (typeof this.wallet.request === 'function') {
      accounts = await this.wallet.request({
        method: 'fastset_accounts'
      });
    } else if (this.wallet.accounts) {
      accounts = this.wallet.accounts;
    } else if (this.wallet.selectedAddress) {
      accounts = [{ address: this.wallet.selectedAddress }];
    }

    return this.normalizeAccounts(accounts);
  }

  /**
   * Check whether Fastset Wallet Extension is installed
   */
  checkInstalled() {
    const provider = this.resolveWalletProvider();
    this.isInstalled = Boolean(provider);

    if (this.isInstalled) {
      this.wallet = provider;
      console.log('✅ Fastset Wallet detected:', this.wallet);
    } else {
      const root = typeof window !== 'undefined' ? window.fastset : undefined;
      const rootKeys = root && typeof root === 'object' ? Object.keys(root) : [];
      console.log('⚠️ Fastset Wallet provider not detected or missing API methods. window.fastset keys:', rootKeys);
    }

    return this.isInstalled;
  }

  /**
   * Connect wallet - try multiple methods
   */
  async connect() {
    if (!this.checkInstalled()) {
      throw new Error('Fastset Wallet Extension is not installed');
    }

    try {
      console.log('🔗 Attempting to connect...');
      let lastError = null;
      const connectMethods = [];

      if (typeof this.wallet.connect === 'function') {
        connectMethods.push(async () => {
          console.log('Trying wallet.connect()...');
          return this.wallet.connect();
        });
      }

      if (typeof this.wallet.request === 'function') {
        connectMethods.push(async () => {
          console.log('Trying wallet.request(fastset_requestAccounts)...');
          return this.wallet.request({ method: 'fastset_requestAccounts' });
        });
      }

      if (typeof this.wallet.enable === 'function') {
        connectMethods.push(async () => {
          console.log('Trying wallet.enable()...');
          return this.wallet.enable();
        });
      }

      connectMethods.push(async () => {
        console.log('Trying to read existing wallet accounts...');
        return this.readAccountsFromWallet();
      });

      for (const tryConnect of connectMethods) {
        try {
          const rawResult = await tryConnect();
          const accounts = this.normalizeAccounts(rawResult);
          console.log('Accounts received:', accounts);
          const primaryAccount = this.getPrimaryAccount(accounts);
          if (primaryAccount) {
            this.account = primaryAccount;
            console.log('✅ Connected successfully:', this.account);
            return this.account;
          }
        } catch (error) {
          lastError = error;
          console.log('Connection attempt failed, trying fallback method...', error);

          if (error?.code === 4001 || error?.code === -32002) {
            throw error;
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      throw new Error('No active account found. Open Fastset Wallet and create/import an account first.');
    } catch (error) {
      console.error('❌ Connection error:', error);
      throw error;
    }
  }

  /**
   * Disconnect from wallet
   */
  async disconnect() {
    if (!this.checkInstalled()) {
      this.account = null;
      return true;
    }

    try {
      if (typeof this.wallet.disconnect === 'function') {
        await this.wallet.disconnect();
      } else if (typeof this.wallet.request === 'function') {
        try {
          await this.wallet.request({ method: 'fastset_disconnect' });
        } catch (error) {
          // Some wallet versions do not expose explicit disconnect RPC.
          console.log('Wallet disconnect RPC not available:', error?.message || error);
        }
      }
    } catch (error) {
      console.log('Wallet disconnect call failed, clearing local session:', error);
    }

    this.account = null;
    console.log('🔌 Disconnected from wallet');
    return true;
  }

  /**
   * Get current connected account - try multiple methods
   */
  async getAccounts() {
    if (!this.checkInstalled()) {
      return [];
    }

    try {
      const accounts = await this.readAccountsFromWallet();
      if (accounts && accounts.length > 0) {
        this.account = this.getPrimaryAccount(accounts) || accounts[0];
        return accounts;
      }

      this.account = null;
      return [];
    } catch (error) {
      console.log('No accounts available yet');
      this.account = null;
      return [];
    }
  }

  /**
   * Get account balance
   */
  async getBalance(address) {
    if (!this.account && !address) {
      throw new Error('No account connected');
    }

    try {
      const addr = address || this.account.address;

      if (typeof this.wallet.getBalance === 'function') {
        return await this.wallet.getBalance(addr);
      } else if (typeof this.wallet.request === 'function') {
        return await this.wallet.request({
          method: 'fastset_getBalance',
          params: { address: addr }
        });
      }

      throw new Error('getBalance method not available');
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  /**
   * Sign transaction
   */
  async signTransaction(transaction) {
    if (!this.account) {
      throw new Error('Wallet is not connected');
    }

    try {
      const providers = this.getProviderCandidates();
      const trialProviders = [this.wallet, ...providers].filter(Boolean);
      const uniqueProviders = [];
      for (const provider of trialProviders) {
        if (!uniqueProviders.includes(provider)) {
          uniqueProviders.push(provider);
        }
      }

      let lastError = null;

      for (const provider of uniqueProviders) {
        if (!provider) continue;

        if (typeof provider.signTransaction === 'function') {
          try {
            this.wallet = provider;
            return await provider.signTransaction(transaction);
          } catch (error) {
            lastError = error;
            console.log('provider.signTransaction attempt failed:', error?.message || error);
          }
        }

        if (
          typeof provider.request === 'function' ||
          typeof provider.send === 'function' ||
          typeof provider.sendAsync === 'function'
        ) {
          const signAttempts = [
            () => this.invokeRpc(provider, 'fastset_signTransaction', { transaction }),
            () => this.invokeRpc(provider, 'fastset_signTransaction', [transaction]),
            () => this.invokeRpc(provider, 'fastset_signTransaction', transaction),
            () => this.invokeRpc(provider, 'set_signTransaction', { transaction }),
            () => this.invokeRpc(provider, 'set_signTransaction', [transaction]),
            () => this.invokeRpc(provider, 'signTransaction', { transaction }),
            () => this.invokeRpc(provider, 'signTransaction', [transaction])
          ];

          for (const trySign of signAttempts) {
            try {
              this.wallet = provider;
              return await trySign();
            } catch (signError) {
              lastError = signError;
              console.log('signTransaction attempt failed:', signError?.message || signError);
            }
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      const methodList = this.wallet
        ? Object.keys(this.wallet).filter((key) => typeof this.wallet[key] === 'function')
        : [];
      throw new Error(`signTransaction method not available (available: ${methodList.join(', ') || 'none'})`);
    } catch (error) {
      console.error('Error signing transaction:', error);
      throw error;
    }
  }

  /**
   * Send transaction
   */
  async sendTransaction(transaction) {
    if (!this.account) {
      throw new Error('Wallet is not connected');
    }

    try {
      const buildTransactionVariants = (tx) => {
        const variants = [tx];
        if (typeof tx?.timestamp_nanos === 'bigint') {
          variants.push({ ...tx, timestamp_nanos: tx.timestamp_nanos.toString() });
          variants.push({ ...tx, timestamp_nanos: Number(tx.timestamp_nanos) });
        }
        return variants;
      };

      const transactionVariants = buildTransactionVariants(transaction);
      const providers = this.getProviderCandidates();
      const trialProviders = [this.wallet, ...providers].filter(Boolean);
      const uniqueProviders = [];
      for (const provider of trialProviders) {
        if (!uniqueProviders.includes(provider)) {
          uniqueProviders.push(provider);
        }
      }
      let lastSendError = null;

      for (const provider of uniqueProviders) {
        if (!provider) continue;

        try {
          const claimOrTransferResult = await this.tryClaimOrTransferApi(provider, transactionVariants[0]);
          if (claimOrTransferResult !== null && claimOrTransferResult !== undefined) {
            this.wallet = provider;
            return claimOrTransferResult;
          }
        } catch (specialApiError) {
          lastSendError = specialApiError;
          console.log('Claim/transfer API attempt failed:', specialApiError?.message || specialApiError);
        }

        if (typeof provider.sendTransaction === 'function') {
          for (const txVariant of transactionVariants) {
            try {
              this.wallet = provider;
              return await provider.sendTransaction(txVariant);
            } catch (error) {
              lastSendError = error;
              console.log('wallet.sendTransaction attempt failed:', error?.message || error);
            }
          }
        }

        if (typeof provider.submitTransaction === 'function') {
          for (const txVariant of transactionVariants) {
            try {
              this.wallet = provider;
              return await provider.submitTransaction(txVariant);
            } catch (error) {
              lastSendError = error;
              console.log('wallet.submitTransaction attempt failed:', error?.message || error);
            }
          }
        }

        if (
          typeof provider.request === 'function' ||
          typeof provider.send === 'function' ||
          typeof provider.sendAsync === 'function'
        ) {
          for (const txVariant of transactionVariants) {
            const sendAttempts = [
              () => this.invokeRpc(provider, 'fastset_sendTransaction', { transaction: txVariant }),
              () => this.invokeRpc(provider, 'fastset_sendTransaction', [txVariant]),
              () => this.invokeRpc(provider, 'fastset_sendTransaction', txVariant),
              () => this.invokeRpc(provider, 'proxy_submitTransaction', { transaction: txVariant }),
              () => this.invokeRpc(provider, 'proxy_submitTransaction', [txVariant])
            ];

            for (const trySend of sendAttempts) {
              try {
                this.wallet = provider;
                return await trySend();
              } catch (sendError) {
                lastSendError = sendError;
                console.log('Transaction request attempt failed:', sendError?.message || sendError);
              }
            }
          }
        }
      }

      const canSign =
        typeof this.wallet.signTransaction === 'function' ||
        typeof this.wallet.fastset_signTransaction === 'function' ||
        typeof this.wallet.request === 'function' ||
        typeof this.wallet.send === 'function' ||
        typeof this.wallet.sendAsync === 'function';

      // If wallet cannot sign, surface real send error instead of masking it.
      if (!canSign) {
        if (lastSendError) {
          throw lastSendError;
        }
        throw new Error('Wallet does not support transaction submission or signing');
      }

      // Fallback path for wallets that can sign but cannot directly submit.
      const signature = await this.signTransaction(transactionVariants[0]);
      const normalizedSignature = Array.isArray(signature)
        ? signature
        : signature?.Signature || signature?.signature || null;

      if (!Array.isArray(normalizedSignature) || normalizedSignature.length !== 64) {
        if (lastSendError) {
          throw lastSendError;
        }
        throw new Error('Wallet returned invalid signature format');
      }

      const submitted = await dexApi.submitSignedTransaction(transactionVariants[0], normalizedSignature);
      return submitted?.data || submitted;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw error;
    }
  }

  /**
   * Listen for account changes
   */
  onAccountsChanged(callback) {
    if (!this.checkInstalled()) {
      return;
    }

    if (this.wallet.on) {
      this.wallet.on('accountsChanged', (accounts) => {
        console.log('🔄 Accounts changed:', accounts);
        if (accounts && accounts.length > 0) {
          this.account = accounts[0];
          callback(this.account);
        } else {
          this.account = null;
          callback(null);
        }
      });
    } else if (this.wallet.addEventListener) {
      this.wallet.addEventListener('accountsChanged', (event) => {
        const accounts = event.detail || event.accounts;
        if (accounts && accounts.length > 0) {
          this.account = accounts[0];
          callback(this.account);
        } else {
          this.account = null;
          callback(null);
        }
      });
    }
  }

  /**
   * Listen for disconnect
   */
  onDisconnect(callback) {
    if (!this.checkInstalled()) {
      return;
    }

    if (this.wallet.on) {
      this.wallet.on('disconnect', () => {
        console.log('🔌 Wallet disconnected');
        this.account = null;
        callback();
      });
    } else if (this.wallet.addEventListener) {
      this.wallet.addEventListener('disconnect', () => {
        this.account = null;
        callback();
      });
    }
  }

  /**
   * Format address for display
   */
  formatAddress(address) {
    if (!address) return '';

    if (Array.isArray(address)) {
      const hex = address.map(b => b.toString(16).padStart(2, '0')).join('');
      return `0x${hex.slice(0, 6)}...${hex.slice(-4)}`;
    }

    if (typeof address === 'string') {
      if (address.startsWith('fast1')) {
        return `${address.slice(0, 10)}...${address.slice(-6)}`;
      }
      if (address.startsWith('0x')) {
        return `${address.slice(0, 8)}...${address.slice(-6)}`;
      }
      return `${address.slice(0, 8)}...${address.slice(-6)}`;
    }

    return '';
  }

  /**
   * Convert address to the required format
   */
  addressToBytes(address) {
    if (Array.isArray(address)) {
      return address;
    }

    if (typeof address === 'string') {
      const hex = address.replace(/^0x/, '');
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      return bytes;
    }

    throw new Error('Invalid address format');
  }

  /**
   * Get wallet info
   */
  getWalletInfo() {
    const info = {
      name: 'Fastset Wallet',
      isInstalled: this.isInstalled,
      downloadUrl: 'https://chromewebstore.google.com/detail/fastset-wallet/ghibjknldlhfffnckpencpcjbhefblbe'
    };

    if (this.isInstalled && this.wallet) {
      info.version = this.wallet.version || '1.0.0';
      info.methods = Object.keys(this.wallet).filter(key => typeof this.wallet[key] === 'function');
      console.log('Wallet methods available:', info.methods);
    }

    return info;
  }

  /**
   * Debug: Log all available methods
   */
  debugWallet() {
    if (!this.checkInstalled()) {
      console.log('Wallet not installed');
      return;
    }

    console.log('=== Fastset Wallet Debug ===');
    console.log('Wallet object:', this.wallet);
    console.log('Available methods:', Object.keys(this.wallet).filter(k => typeof this.wallet[k] === 'function'));
    console.log('Available properties:', Object.keys(this.wallet).filter(k => typeof this.wallet[k] !== 'function'));
    console.log('===========================');
  }
}

// Singleton instance
export const fastsetWallet = new FastsetWallet();

// Auto-debug on load (development only)
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
  setTimeout(() => {
    fastsetWallet.debugWallet();
  }, 1000);
}

export default fastsetWallet;
