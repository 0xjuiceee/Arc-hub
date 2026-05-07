import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { RITUAL_CHAIN } from '@/lib/ritual-chain';

/* eslint-disable @typescript-eslint/no-explicit-any */
const getEthereum = (): any => (window as any).ethereum;

interface WalletState {
  address: string | null;
  balance: string;
  chainId: number | null;
  isConnected: boolean;
  isCorrectChain: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToRitual: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WalletState>({
    address: null,
    balance: '0',
    chainId: null,
    isConnected: false,
    isCorrectChain: false,
    provider: null,
    signer: null,
  });

  const updateBalance = useCallback(async (provider: ethers.BrowserProvider, address: string) => {
    try {
      const bal = await provider.getBalance(address);
      setState(prev => ({ ...prev, balance: ethers.formatEther(bal) }));
    } catch {
      // ignore
    }
  }, []);

  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }

    const provider = new ethers.BrowserProvider(ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const signer = await provider.getSigner();
    const address = accounts[0];

    setState({
      address,
      balance: '0',
      chainId,
      isConnected: true,
      isCorrectChain: chainId === RITUAL_CHAIN.chainId,
      provider,
      signer,
    });

    updateBalance(provider, address);
  }, [updateBalance]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      balance: '0',
      chainId: null,
      isConnected: false,
      isCorrectChain: false,
      provider: null,
      signer: null,
    });
  }, []);

  const switchToRitual = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: RITUAL_CHAIN.chainIdHex }],
      });
    } catch (err: any) {
      if (err.code === 4902) {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: RITUAL_CHAIN.chainIdHex,
            chainName: RITUAL_CHAIN.name,
            nativeCurrency: RITUAL_CHAIN.currency,
            rpcUrls: [RITUAL_CHAIN.rpcUrl],
            blockExplorerUrls: [RITUAL_CHAIN.explorerUrl],
          }],
        });
      }
    }
    await connect();
  }, [connect]);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) disconnect();
      else connect();
    };
    const handleChainChanged = () => connect();

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [connect, disconnect]);

  useEffect(() => {
    const ethereum = getEthereum();
    if (ethereum) {
      ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) connect();
      });
    }
  }, [connect]);

  return (
    <WalletContext.Provider value={{ ...state, connect, disconnect, switchToRitual }}>
      {children}
    </WalletContext.Provider>
  );
};
