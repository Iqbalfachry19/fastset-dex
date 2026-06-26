import { useState, useEffect } from 'react';
import { buildDepositTransaction, buildTransferIntent, buildRevokeIntent, buildExecuteIntent } from '@fastxyz/allset-sdk';
import { createPublicClient, createWalletClient, custom, http, encodeAbiParameters, encodeFunctionData, parseUnits } from 'viem';
import { sepolia, baseSepolia, arbitrumSepolia } from 'viem/chains';
import { useFastsetWallet } from '../hooks/useFastsetWallet';
import { dexApi } from '../utils/api';
import { TOKENS, formatTokenAmount } from '../utils/tokens';
import { fastsetWallet } from '../utils/fastsetWallet';

export default function BridgePanel({ address, onTransactionSuccess, defaultMode = 'deposit', intentType = 'transfer' }) {
  const [mode, setMode] = useState(defaultMode); // 'deposit' or 'withdraw'
  const [amount, setAmount] = useState('');
  const [evmAddress, setEvmAddress] = useState(null);
  const [selectedChainKey, setSelectedChainKey] = useState('ethereum-sepolia');
  const [isEvmConnecting, setIsEvmConnecting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [fastBalances, setFastBalances] = useState({ ETH: '0', USDC: '0' });
  const [fastBalanceLoading, setFastBalanceLoading] = useState(false);
  const [fastBalanceError, setFastBalanceError] = useState(null);
  const [evmBalances, setEvmBalances] = useState({ USDC: '0', ETH: '0' });
  const [evmBalanceLoading, setEvmBalanceLoading] = useState(false);
  const [evmBalanceError, setEvmBalanceError] = useState(null);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [v4Fee, setV4Fee] = useState('3000');
  const [v4TickSpacing, setV4TickSpacing] = useState('60');
  const [v4Hooks, setV4Hooks] = useState('0x0000000000000000000000000000000000000000');
  const [v4MinOut, setV4MinOut] = useState('');
  const [v4Quote, setV4Quote] = useState(null);
  const [v4QuoteLoading, setV4QuoteLoading] = useState(false);
  const [v4QuoteError, setV4QuoteError] = useState(null);
  const [usdcAddressOverrides, setUsdcAddressOverrides] = useState({});

  const { isConnected: isFastConnected, sendTransaction, addressToBytes, account } = useFastsetWallet();
  const FAST_USDC_LABEL = 'USDC';
  const EVM_CHAIN_CONFIGS = {
    'ethereum-sepolia': {
      key: 'ethereum-sepolia',
      label: 'Ethereum Sepolia',
      viemChain: sepolia,
    },
    'base-sepolia': {
      key: 'base-sepolia',
      label: 'Base Sepolia',
      viemChain: baseSepolia,
    },
    'arbitrum-sepolia': {
      key: 'arbitrum-sepolia',
      label: 'Arbitrum Sepolia',
      viemChain: arbitrumSepolia,
    },
  };

  const UNISWAP_V4_ADDRESSES = {
    'ethereum-sepolia': {
      poolManager: '0xE03A1074c86CFeDd5C142C4F04F1a1536e203543',
      universalRouter: '0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b',
      positionManager: '0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4',
      stateView: '0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c',
      quoter: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',
      permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    },
    'base-sepolia': {
      poolManager: '0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408',
      universalRouter: '0x492e6456d9528771018deb9e87ef7750ef184104',
      positionManager: '0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80',
      stateView: '0x571291b572ed32ce6751a2cb2486ebee8defb9b4',
      quoter: '0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba',
      permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    },
    'arbitrum-sepolia': {
      poolManager: '0xFB3e0C6F74eB1a21CC1Da29aeC80D2Dfe6C9a317',
      universalRouter: '0xefd1d4bd4cf1e86da286bb4cb1b8bced9c10ba47',
      positionManager: '0xAc631556d3d4019C95769033B5E719dD77124BAc',
      stateView: '0x9d467fa9062b6e9b1a46e26007ad82db116c67cb',
      quoter: '0x7de51022d70a725b508085468052e25e22b5c4c9',
      permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    },
  };

  const USDC_EVM_BY_CHAIN = {
    'ethereum-sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    'arbitrum-sepolia': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  };

  const activeChain = EVM_CHAIN_CONFIGS[selectedChainKey] || EVM_CHAIN_CONFIGS['ethereum-sepolia'];
  const activeUniswap = UNISWAP_V4_ADDRESSES[selectedChainKey] || UNISWAP_V4_ADDRESSES['ethereum-sepolia'];
  const USDC_EVM_ADDRESS = usdcAddressOverrides[selectedChainKey] || USDC_EVM_BY_CHAIN[selectedChainKey] || USDC_EVM_BY_CHAIN['ethereum-sepolia'];

  const normalizeAmount = (rawAmount) => {
    if (rawAmount === null || rawAmount === undefined) return '0';
    if (typeof rawAmount === 'number' || typeof rawAmount === 'bigint') return rawAmount.toString();
    if (typeof rawAmount !== 'string') return '0';

    const value = rawAmount.trim();
    if (!value || value === '0') return '0';

    try {
      const isNegative = value.startsWith('-');
      const absValue = isNegative ? value.slice(1) : value;
      const cleanAbsValue = absValue.startsWith('0x') ? absValue : `0x${absValue}`;
      const bigint = BigInt(cleanAbsValue);
      return isNegative ? `-${bigint.toString()}` : bigint.toString();
    } catch (err) {
      if (/^-?[0-9]+$/.test(value)) return value;
      return '0';
    }
  };

  const findTokenBalance = (tokenBalances, tokenId) => {
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

  const resolveFastBalanceAddress = async () => {
    const directAddress = normalizeAddressForApi(address) || normalizeAddressForApi(account);
    if (Array.isArray(directAddress) && directAddress.length === 32) return directAddress;

    try {
      const accounts = await fastsetWallet.getAccounts();
      if (accounts && accounts.length > 0) {
        const walletAddr = normalizeAddressForApi(accounts[0]);
        if (Array.isArray(walletAddr) && walletAddr.length === 32) {
          return walletAddr;
        }
      }
    } catch (err) {
      console.log('Unable to refresh address bytes from wallet:', err);
    }

    return directAddress;
  };

  useEffect(() => {
    const loadFastBalances = async () => {
      if (!isFastConnected || !address) {
        setFastBalances({ ETH: '0', USDC: '0' });
        setFastBalanceError(null);
        return;
      }

      try {
        setFastBalanceLoading(true);
        setFastBalanceError(null);

        const balanceAddress = await resolveFastBalanceAddress();
        const response = await dexApi.getAccountInfo(balanceAddress);
        const accountInfo = response?.data || response;
        const tokenBalances = accountInfo?.token_balance || accountInfo?.token_balances || accountInfo?.tokenBalances || [];

        setFastBalances({
          ETH: findTokenBalance(tokenBalances, TOKENS.ETH.id),
          USDC: findTokenBalance(tokenBalances, TOKENS.USDC.id),
        });
      } catch (err) {
        setFastBalanceError(err.response?.data?.error || err.message);
      } finally {
        setFastBalanceLoading(false);
      }
    };

    loadFastBalances();
  }, [isFastConnected, address, balanceRefreshKey]);

  useEffect(() => {
    const loadEvmBalances = async () => {
      if (!evmAddress) {
        setEvmBalances({ USDC: '0', ETH: '0' });
        setEvmBalanceError(null);
        return;
      }

      try {
        setEvmBalanceLoading(true);
        setEvmBalanceError(null);

        const publicClient = createPublicClient({
          chain: activeChain.viemChain,
          transport: http()
        });

        const erc20Abi = [
          { name: 'balanceOf', type: 'function', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' }
        ];

        const [ethBalance, usdcBalance] = await Promise.all([
          publicClient.getBalance({ address: evmAddress }),
          publicClient.readContract({
            address: USDC_EVM_ADDRESS,
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [evmAddress],
          }),
        ]);

        setEvmBalances({
          ETH: ethBalance.toString(),
          USDC: usdcBalance.toString(),
        });
      } catch (err) {
        setEvmBalanceError(err.message);
      } finally {
        setEvmBalanceLoading(false);
      }
    };

    loadEvmBalances();
  }, [evmAddress, balanceRefreshKey, selectedChainKey, USDC_EVM_ADDRESS]);

  useEffect(() => {
    const shouldPoll = isFastConnected || evmAddress;
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      setBalanceRefreshKey((prev) => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, [isFastConnected, evmAddress]);

  useEffect(() => {
    if (intentType !== 'uniswap' || mode !== 'withdraw') {
      setV4Quote(null);
      setV4QuoteError(null);
      return undefined;
    }

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setV4Quote(null);
      setV4QuoteError(null);
      return undefined;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setV4QuoteLoading(true);
        setV4QuoteError(null);

        const fee = Number(v4Fee || '0');
        const tickSpacing = Number(v4TickSpacing || '0');
        const hooks = v4Hooks || '0x0000000000000000000000000000000000000000';
        const amountIn = parseUnits(amount, 6);

        const tokenIn = USDC_EVM_ADDRESS;
        const tokenOut = '0x0000000000000000000000000000000000000000';
        const normalizedTokenIn = tokenIn.toLowerCase();
        const normalizedTokenOut = tokenOut.toLowerCase();
        const [currency0, currency1] = normalizedTokenIn < normalizedTokenOut
          ? [tokenIn, tokenOut]
          : [tokenOut, tokenIn];
        const zeroForOne = normalizedTokenIn === currency0.toLowerCase();

        const publicClient = createPublicClient({
          chain: activeChain.viemChain,
          transport: http()
        });

        const quoterAbi = [{
          name: 'quoteExactInputSingle',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [{
            name: 'params',
            type: 'tuple',
            components: [
              {
                name: 'poolKey',
                type: 'tuple',
                components: [
                  { name: 'currency0', type: 'address' },
                  { name: 'currency1', type: 'address' },
                  { name: 'fee', type: 'uint24' },
                  { name: 'tickSpacing', type: 'int24' },
                  { name: 'hooks', type: 'address' },
                ],
              },
              { name: 'zeroForOne', type: 'bool' },
              { name: 'exactAmount', type: 'uint128' },
              { name: 'hookData', type: 'bytes' },
            ],
          }],
          outputs: [
            { name: 'amountOut', type: 'uint256' },
            { name: 'gasEstimate', type: 'uint256' },
          ],
        }];

        const quote = await publicClient.readContract({
          address: activeUniswap.quoter,
          abi: quoterAbi,
          functionName: 'quoteExactInputSingle',
          args: [{
            poolKey: { currency0, currency1, fee, tickSpacing, hooks },
            zeroForOne,
            exactAmount: amountIn,
            hookData: '0x',
          }],
        });

        if (cancelled) return;
        const amountOut = Array.isArray(quote) ? quote[0] : quote;
        const gasEstimate = Array.isArray(quote) ? quote[1] : null;
        setV4Quote({
          amountOut: amountOut?.toString?.() ?? String(amountOut),
          gasEstimate: gasEstimate?.toString?.() ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        setV4Quote(null);
        const rawMessage = err?.message || String(err);
        const friendly = rawMessage.includes('execution reverted') || rawMessage.includes('quoteExactInputSingle')
          ? `Quote failed. Pool may be uninitialized or lack liquidity on ${activeChain.label} for fee ${v4Fee} / tickSpacing ${v4TickSpacing}.`
          : rawMessage;
        setV4QuoteError(friendly);
      } finally {
        if (!cancelled) setV4QuoteLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intentType, mode, amount, v4Fee, v4TickSpacing, v4Hooks, selectedChainKey, USDC_EVM_ADDRESS]);

  useEffect(() => {
    setEvmAddress(null);
  }, [selectedChainKey]);

  // Connect to Metamask (Sepolia)
  const connectEvm = async () => {
    if (!window.ethereum) {
      setError('Please install Metamask to use the bridge.');
      return;
    }

    try {
      setIsEvmConnecting(true);
      setError(null);

      const walletClient = createWalletClient({
        chain: activeChain.viemChain,
        transport: custom(window.ethereum)
      });

      const [addr] = await walletClient.requestAddresses();
      setEvmAddress(addr);

      // Switch to selected chain if needed
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${activeChain.viemChain.id.toString(16)}` }],
        });
      } catch (switchError) {
        if (switchError.code === 4902) {
          const rpcUrls = activeChain.viemChain.rpcUrls?.default?.http || [];
          const explorerUrl = activeChain.viemChain.blockExplorers?.default?.url;
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${activeChain.viemChain.id.toString(16)}`,
              chainName: activeChain.viemChain.name,
              rpcUrls,
              nativeCurrency: activeChain.viemChain.nativeCurrency,
              blockExplorerUrls: explorerUrl ? [explorerUrl] : []
            }],
          });
        }
      }
    } catch (err) {
      console.error('EVM Connection Error:', err);
      setError(err.message);
    } finally {
      setIsEvmConnecting(false);
    }
  };

  const fastBalanceText = fastBalanceLoading
    ? 'Loading...'
    : fastBalanceError
      ? 'Error'
      : `${formatTokenAmount(fastBalances.USDC, TOKENS.USDC.decimals)} ${FAST_USDC_LABEL} · ${formatTokenAmount(fastBalances.ETH, TOKENS.ETH.decimals)} ETH`;

  const evmBalanceText = evmBalanceLoading
    ? 'Loading...'
    : evmBalanceError
      ? 'Error'
      : `${formatTokenAmount(evmBalances.USDC, TOKENS.USDC.decimals)} USDC · ${formatTokenAmount(evmBalances.ETH, TOKENS.ETH.decimals)} ETH`;

  const hexToUint8Array = (hex) => {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    const bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    return bytes;
  };

  const encodeCommands = (bytes) => {
    return `0x${bytes.map((b) => b.toString(16).padStart(2, '0')).join('')}`;
  };

  const buildUniswapSwapIntent = async (amountIn, recipient) => {
    const tokenIn = USDC_EVM_ADDRESS;
    const tokenOut = '0x0000000000000000000000000000000000000000';
    const fee = Number(v4Fee || '0');
    const tickSpacing = Number(v4TickSpacing || '0');
    const hooks = v4Hooks || '0x0000000000000000000000000000000000000000';

    const normalizedTokenIn = tokenIn.toLowerCase();
    const normalizedTokenOut = tokenOut.toLowerCase();

    const [currency0, currency1] = normalizedTokenIn < normalizedTokenOut
      ? [tokenIn, tokenOut]
      : [tokenOut, tokenIn];

    const zeroForOne = normalizedTokenIn == currency0.toLowerCase();

    const minOut = v4MinOut
      ? parseUnits(v4MinOut, 18)
      : 0n;

    const amountIn128 = BigInt(amountIn);
    const minOut128 = minOut > 0n ? minOut : 0n;

    const poolKey = {
      currency0,
      currency1,
      fee,
      tickSpacing,
      hooks,
    };

    const swapInput = encodeAbiParameters(
      [
        {
          type: 'tuple',
          components: [
            { name: 'currency0', type: 'address' },
            { name: 'currency1', type: 'address' },
            { name: 'fee', type: 'uint24' },
            { name: 'tickSpacing', type: 'int24' },
            { name: 'hooks', type: 'address' },
          ]
        },
        { type: 'bool' },
        { type: 'uint128' },
        { type: 'uint128' },
        { type: 'uint256' },
        { type: 'bytes' },
      ],
      [poolKey, zeroForOne, amountIn128, minOut128, 0n, '0x']
    );

    const settleInput = encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'uint256' },
        { type: 'bool' },
      ],
      [tokenIn, 0n, false]
    );

    const takeInput = encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [tokenOut, recipient, 0n]
    );

    const actions = encodeCommands([0x06, 0x0b, 0x0e]);
    const v4SwapInput = encodeAbiParameters(
      [
        { type: 'bytes' },
        { type: 'bytes[]' },
      ],
      [actions, [swapInput, settleInput, takeInput]]
    );

    const commands = encodeCommands([0x10]);

    const routerAbi = [
      {
        name: 'execute',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'commands', type: 'bytes' },
          { name: 'inputs', type: 'bytes[]' },
          { name: 'deadline', type: 'uint256' },
        ],
        outputs: [],
      },
    ];

    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const calldata = encodeFunctionData({
      abi: routerAbi,
      functionName: 'execute',
      args: [commands, [v4SwapInput], deadline],
    });

    return buildExecuteIntent(activeUniswap.universalRouter, calldata, 0n);
  };

  const handleBridge = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!evmAddress) {
      await connectEvm();
      return;
    }

    if (!isFastConnected) {
      setError('Please connect your Fastset Wallet first.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatus('Initializing bridge operation...');

      const amountAtomic = (BigInt(Math.floor(parseFloat(amount) * 1000000))).toString();

      if (mode === 'deposit') {
        setStatus('Planning deposit transaction...');

        // 1. Build the transaction using pure SDK planner
        const fastAddr = typeof address === 'string' ? address : Array.from(address).map(b => b.toString(16).padStart(2, '0')).join('');

        const plan = buildDepositTransaction({
          network: 'testnet',
          chain: selectedChainKey,
          token: 'USDC',
          amount: BigInt(amountAtomic),
          receiver: fastAddr,
          networkConfig: {
            chains: {
              "base-sepolia": {
                chainId: 84532,
                bridgeContract: '0x83f0644FF860423539Dc6b6cA6d3b05a6F03337B',
                tokens: {
                  USDC: {
                    evmAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
                    decimals: 6,
                  },
                },
              },
            },
          },
        });

        // 2. Initial Checks & Approval
        const USDC_ADDRESS = USDC_EVM_ADDRESS; // Sepolia USDC
        const BRIDGE_ADDRESS_EVM = plan.to;

        const publicClient = createPublicClient({
          chain: activeChain.viemChain,
          transport: http()
        });

        const walletClient = createWalletClient({
          chain: activeChain.viemChain,
          transport: custom(window.ethereum)
        });

        const erc20Abi = [
          { name: 'allowance', type: 'function', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
          { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' }
        ];

        setStatus('Checking USDC allowance...');
        const allowance = await publicClient.readContract({
          address: USDC_ADDRESS,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [evmAddress, BRIDGE_ADDRESS_EVM]
        });

        if (allowance < BigInt(amountAtomic)) {
          setStatus('Approving USDC for bridge (please check wallet)...');
          const approveHash = await walletClient.writeContract({
            account: evmAddress,
            address: USDC_ADDRESS,
            abi: erc20Abi,
            functionName: 'approve',
            args: [BRIDGE_ADDRESS_EVM, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')] // Max approval
          });

          setStatus('Waiting for approval confirmation...');
          await publicClient.waitForTransactionReceipt({ hash: approveHash });
          setStatus('Approval confirmed! Proceeding with deposit...');
        }

        // 3. Estimate gas to avoid "limit too high" error
        const gasEstimate = await publicClient.estimateGas({
          account: evmAddress,
          to: plan.to,
          data: plan.data,
          value: plan.value ? BigInt(plan.value) : 0n
        });

        setStatus('Submitting deposit to bridge...');
        const txHash = await walletClient.sendTransaction({
          account: evmAddress,
          to: plan.to,
          data: plan.data,
          value: plan.value ? BigInt(plan.value) : 0n,
          gas: (gasEstimate * 120n) / 100n // Add 20% safety buffer
        });

        setStatus(`Deposit submitted! Hash: ${txHash.slice(0, 10)}...`);
        setBalanceRefreshKey((prev) => prev + 1);
        if (onTransactionSuccess) {
          onTransactionSuccess({
            action: 'Bridge',
            claimType: 'Deposit',
            claimRef: 'submitted',
            txIds: [{ label: 'EVM', id: txHash }],
            amount: amountAtomic,
            token: 'USDC',
            hash: txHash,
            summary: `Bridge deposit ${amount} USDC (EVM: ${txHash.slice(0, 10)}...)`
          });
        }
      } else {
        setStatus('Preparing withdrawal...');

        const USDC_EVM_ADDR = USDC_EVM_ADDRESS;
        const BRIDGE_ADDRESS = 'fast1fxtkgpwcy7hnakw96gg7relph4wxx7ghrukm723p3l9adxuxljzsc6f958';
        const fastAddr = typeof address === 'string'
          ? address
          : Array.from(address).map(b => b.toString(16).padStart(2, '0')).join('');

        // ── Step 1: Sign the transfer tx (tokens → bridge) ───────────────────────
        setStatus('Step 1/4: Sign transfer on Fast network...');

        const transferTx = {
          claim: {
            TokenTransfer: {
              token_id: [215, 58, 6, 121, 162, 190, 70, 152, 30, 42, 138, 237, 236, 217, 81, 200, 182, 105, 14, 125, 95, 133, 2, 179, 78, 211, 255, 76, 194, 22, 59, 70],
              recipient: [119, 16, 69, 13, 167, 163, 146, 211, 96, 233, 190, 192, 186, 88, 76, 228, 2, 153, 52, 45, 103, 196, 87, 239, 149, 20, 65, 206, 154, 162, 195, 127],
              amount: amountAtomic,
              user_data: null,
            },
          },
          recipient_display: BRIDGE_ADDRESS,
        };

        const transferResult = await sendTransaction(transferTx);
        console.log('[bridge] raw transferResult:', JSON.stringify(transferResult, null, 2));

        // The wallet returns { envelope, signatures } — keep both for cross-signing
        const transferCert = transferResult;

        // ── Step 2: Backend cross-signs transfer → returns txHash ─────────────────
        setStatus('Step 2/4: Cross-signing transfer (backend)...');

        const crossSignRes = await fetch('/api/dex/bridge/cross-sign-cert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ certificate: transferCert }),
        });
        const crossSignJson = await crossSignRes.json();
        if (!crossSignRes.ok || !crossSignJson.ok) {
          throw new Error(crossSignJson.error || 'Transfer cross-sign failed');
        }
        const { txHash: transferTxHash, transaction: transferSignedTx, signature: transferSignedSig } = crossSignJson.data;
        console.log('[bridge] transferTxHash:', transferTxHash);
        setPendingTransfer({ transferTxHash, transferSignedTx, transferSignedSig });

        // ── Step 3: Build intent + sign intent tx ────────────────────────────────
        setStatus('Step 3/4: Building & signing intent on Fast network...');

        const intents = intentType === 'uniswap'
          ? [
            buildTransferIntent(USDC_EVM_ADDR, activeUniswap.universalRouter),
            await buildUniswapSwapIntent(amountAtomic, evmAddress)
          ]
          : [buildTransferIntent(USDC_EVM_ADDR, evmAddress)];
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        const intentClaimEncoded = encodeAbiParameters(
          [{
            type: 'tuple',
            components: [
              { name: 'transferFastTxId', type: 'bytes32' },
              { name: 'deadline', type: 'uint256' },
              {
                name: 'intents', type: 'tuple[]',
                components: [
                  { name: 'action', type: 'uint8' },
                  { name: 'payload', type: 'bytes' },
                  { name: 'value', type: 'uint256' },
                ],
              },
            ],
          }],
          [{
            transferFastTxId: transferTxHash,
            deadline,
            intents: intents.map((intent) => ({
              action: intent.action,
              payload: intent.payload,
              value: intent.value,
            })),
          }]
        );

        const intentBytes = Array.from(hexToUint8Array(intentClaimEncoded));

        const intentTx = {
          claim: {
            ExternalClaim: {
              claim: {
                verifier_committee: [],
                verifier_quorum: 0,
                claim_data: Array.from(intentBytes),
              },
              signatures: []
            },
          },
          recipient_display: 'AllSet Relayer (Intent)',
        };

        const intentResult = await sendTransaction(intentTx);
        console.log('[bridge] raw intentResult:', JSON.stringify(intentResult, null, 2));
        const intentCert = intentResult;
        // ── Step 4: Backend cross-signs intent + submits to relayer ──────────────
        setStatus('Step 4/4: Submitting to relayer via backend...');

        const relayRes = await fetch('/api/dex/bridge/execute-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({

            transferSignedTransaction: transferSignedTx,
            transferSignedSignature: transferSignedSig,
            transferTxHash,
            intentCertificate: intentCert,
            fastsetAddress: fastAddr,
            evmAddress,
            externalAddressOverride: intentType === 'uniswap' ? activeUniswap.universalRouter : undefined,
            evmTokenAddress: USDC_EVM_ADDR,
            chain: selectedChainKey,
          }),
        });

        const relayJson = await relayRes.json();
        if (!relayRes.ok || !relayJson.ok) {
          throw new Error(relayJson.error || 'Backend relay failed');
        }

        const orderId = relayJson.data?.orderId || transferTxHash;
        if (intentType === 'uniswap') {
          setStatus(`Swap submitted! Tracking ID: ${orderId.slice(0, 16)}...`);
        } else {
          setStatus(`Withdrawal submitted! Tracking ID: ${orderId.slice(0, 16)}...`);
        }
        setBalanceRefreshKey((prev) => prev + 1);
        setPendingTransfer(null);

        if (onTransactionSuccess) {
          if (intentType === 'uniswap') {
            onTransactionSuccess({
              action: 'Uniswap',
              claimType: 'Swap',
              claimRef: orderId,
              txIds: [{ label: 'Fast', id: orderId }],
              amount: amountAtomic,
              token: `${FAST_USDC_LABEL}→ETH`,
              hash: orderId,
              summary: `Swap ${amount} ${FAST_USDC_LABEL} to ETH (Fast: ${orderId.slice(0, 10)}...)`,
            });
          } else {
            onTransactionSuccess({
              action: 'Bridge',
              claimType: 'Withdraw',
              claimRef: orderId,
              txIds: [{ label: 'Fast', id: orderId }],
              amount: amountAtomic,
              token: 'fastUSDC',
              hash: orderId,
              summary: `Bridge withdraw ${amount} ${FAST_USDC_LABEL} (Fast: ${orderId.slice(0, 10)}...)`,
            });
          }
        }
      }

      setAmount('');
      setTimeout(() => setStatus(null), 8000);
    } catch (err) {
      console.error('Bridge Error:', err);
      setError(err.message || 'Operation failed.');
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevokeIntent = async () => {
    if (!pendingTransfer) return;
    if (!isFastConnected) {
      setError('Please connect your Fastset Wallet first.');
      return;
    }
    if (!evmAddress) {
      setError('Please connect your Sepolia wallet first.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      setStatus('Revoking pending intent...');

      const USDC_EVM_ADDR = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238';
      const fastAddr = typeof address === 'string'
        ? address
        : Array.from(address).map(b => b.toString(16).padStart(2, '0')).join('');

      const intent = buildRevokeIntent();
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const intentClaimEncoded = encodeAbiParameters(
        [{
          type: 'tuple',
          components: [
            { name: 'transferFastTxId', type: 'bytes32' },
            { name: 'deadline', type: 'uint256' },
            {
              name: 'intents', type: 'tuple[]',
              components: [
                { name: 'action', type: 'uint8' },
                { name: 'payload', type: 'bytes' },
                { name: 'value', type: 'uint256' },
              ],
            },
          ],
        }],
        [{
          transferFastTxId: pendingTransfer.transferTxHash,
          deadline,
          intents: [{ action: intent.action, payload: intent.payload, value: intent.value }],
        }]
      );

      const intentBytes = Array.from(hexToUint8Array(intentClaimEncoded));
      const intentTx = {
        claim: {
          ExternalClaim: {
            claim: {
              verifier_committee: [],
              verifier_quorum: 0,
              claim_data: Array.from(intentBytes),
            },
            signatures: []
          },
        },
        recipient_display: 'AllSet Relayer (Revoke)',
      };

      const intentResult = await sendTransaction(intentTx);
      const intentCert = intentResult;

      setStatus('Submitting revoke to relayer...');
      const relayRes = await fetch('/api/dex/bridge/execute-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transferSignedTransaction: pendingTransfer.transferSignedTx,
          transferSignedSignature: pendingTransfer.transferSignedSig,
          transferTxHash: pendingTransfer.transferTxHash,
          intentCertificate: intentCert,
          fastsetAddress: fastAddr,
          evmAddress,
          evmTokenAddress: USDC_EVM_ADDR,
          chain: 'ethereum-sepolia',
        }),
      });

      const relayJson = await relayRes.json();
      if (!relayRes.ok || !relayJson.ok) {
        throw new Error(relayJson.error || 'Backend relay failed');
      }

      setStatus('Revoke intent submitted.');
      setPendingTransfer(null);
      setBalanceRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error('Revoke intent error:', err);
      setError(err.message || 'Revoke intent failed.');
      setStatus(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="card bridge-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ margin: 0 }}>AllSet</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`tab ${mode === 'deposit' ? 'active' : ''}`}
            onClick={() => setMode('deposit')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Deposit
          </button>
          <button
            className={`tab ${mode === 'withdraw' ? 'active' : ''}`}
            onClick={() => setMode('withdraw')}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            Withdraw
          </button>
        </div>
      </div>

      <div className="alert info" style={{ marginBottom: '24px', textAlign: 'center' }}>
        🌉 {mode === 'deposit'
          ? `Move USDC from ${activeChain.label} to Fast`
          : intentType === 'uniswap'
            ? `Withdraw USDC from Fast and swap to ETH on ${activeChain.label} (Uniswap v4)`
            : `Withdraw USDC from Fast to ${activeChain.label}`}
      </div>

      <div className="card" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>EVM Chain</label>
        <select
          className="input"
          value={selectedChainKey}
          onChange={(e) => setSelectedChainKey(e.target.value)}
        >
          {Object.values(EVM_CHAIN_CONFIGS).map((chain) => (
            <option key={chain.key} value={chain.key}>{chain.label}</option>
          ))}
        </select>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>
          Changing chain will reset the connected EVM wallet.
        </div>
      </div>

      {intentType === 'uniswap' && mode === 'withdraw' && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0 }}>Uniswap v4 Settings (Sepolia)</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Swap USDC → ETH using the v4 Universal Router. Edit fee / tick spacing / hooks if needed.
          </p>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px' }}>
            If the quote fails, try the pool's exact fee + tick spacing or a different chain.
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Fee (uint24)</label>
            <input
              className="input"
              value={v4Fee}
              onChange={(e) => setV4Fee(e.target.value)}
              placeholder="3000"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Tick Spacing (int24)</label>
            <input
              className="input"
              value={v4TickSpacing}
              onChange={(e) => setV4TickSpacing(e.target.value)}
              placeholder="60"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>Hooks Address</label>
            <input
              className="input"
              value={v4Hooks}
              onChange={(e) => setV4Hooks(e.target.value)}
              placeholder="0x0000000000000000000000000000000000000000"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '12px' }}>
            <label>USDC Address (EVM)</label>
            <input
              className="input"
              value={USDC_EVM_ADDRESS}
              onChange={(e) => setUsdcAddressOverrides((prev) => ({
                ...prev,
                [selectedChainKey]: e.target.value.trim()
              }))}
              placeholder="0x..."
            />
          </div>
          <div className="form-group">
            <label>Min Out (ETH)</label>
            <input
              className="input"
              value={v4MinOut}
              onChange={(e) => setV4MinOut(e.target.value)}
              placeholder="0.0"
            />
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '6px' }}>
              Leave blank to accept any amount out (testnet).
            </div>
          </div>
          <div style={{ marginTop: '14px', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>v4 Quote (USDC → ETH)</span>
              <span>
                {v4QuoteLoading
                  ? 'Loading...'
                  : v4Quote
                    ? `${formatTokenAmount(v4Quote.amountOut, 18)} ETH`
                    : '-'}
              </span>
            </div>
            {v4Quote?.gasEstimate && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Gas Estimate</span>
                <span>{v4Quote.gasEstimate}</span>
              </div>
            )}
            {v4QuoteError && (
              <div className="alert error" style={{ marginTop: '8px' }}>
                ⚠️ {v4QuoteError}
              </div>
            )}
          </div>
        </div>
      )}

      {/* From Node */}
      <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span>FROM</span>
          <span>{mode === 'deposit' ? activeChain.label : 'Fast Network'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{mode === 'deposit' ? activeChain.label : 'Fast'}</div>
          <div style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {mode === 'deposit' ? (evmAddress ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` : 'Not Connected') : (address ? 'Connected' : 'Not Connected')}
          </div>
        </div>
        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Balance</span>
          <span>{mode === 'deposit' ? evmBalanceText : fastBalanceText}</span>
        </div>
      </div>

      {/* Arrow */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '-10px 0', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: '32px',
          height: '32px',
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          ↓
        </div>
      </div>

      {/* To Node */}
      <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span>TO</span>
          <span>{mode === 'deposit' ? 'Fast Network' : activeChain.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{mode === 'deposit' ? 'Fast' : activeChain.label}</div>
          <div style={{ flex: 1, textAlign: 'right', fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {mode === 'deposit' ? (address ? 'Connected' : 'Not Connected') : (evmAddress ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` : 'Not Connected')}
          </div>
        </div>
        <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          <span>Balance</span>
          <span>{mode === 'deposit' ? fastBalanceText : evmBalanceText}</span>
        </div>
      </div>

      <div className="form-group">
        <label>Amount to Bridge ({mode === 'deposit' ? 'USDC' : FAST_USDC_LABEL})</label>
        <div style={{ position: 'relative' }}>
          <input
            type="number"
            className="input"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isProcessing}
            style={{ fontSize: '1.6rem', padding: '16px', textAlign: 'center' }}
          />
          <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--primary)' }}>
            {mode === 'deposit' ? 'USDC' : FAST_USDC_LABEL}
          </span>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '20px' }}>⚠️ {error}</div>}
      {status && <div className="alert info" style={{ marginBottom: '20px' }}>🔄 {status}</div>}

      {mode === 'withdraw' && pendingTransfer && (
        <div style={{ marginBottom: '20px' }}>
          <div className="alert warning" style={{ marginBottom: '12px' }}>
            ⚠️ Pending transfer detected. You can revoke the intent before signing a new one.
          </div>
          <button
            className="button secondary"
            onClick={handleRevokeIntent}
            disabled={isProcessing}
          >
            Revoke Intent
          </button>
        </div>
      )}

      {!evmAddress ? (
        <button
          className="button"
          onClick={connectEvm}
          disabled={isEvmConnecting}
        >
          {isEvmConnecting ? '🔌 Connecting Metamask...' : `🔗 Connect ${activeChain.label} Wallet`}
        </button>
      ) : (
        <button
          className={`button ${isProcessing ? 'loading' : ''}`}
          onClick={handleBridge}
          disabled={isProcessing || !amount || !isFastConnected}
        >
          {isProcessing ? '⌛ Processing Transaction...' : (mode === 'deposit' ? '🌉 Initiate Deposit' : '📤 Initiate Withdrawal')}
        </button>
      )}

      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '20px' }}>
        Powered by Allset SDK • High speed cross-chain settlements.
      </p>
    </div>
  );
}
