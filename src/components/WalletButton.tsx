import { Wallet, Zap, LogOut, ExternalLink } from 'lucide-react';
import { useWallet } from '@/contexts/WalletContext';
import { shortenAddress, formatRitual, RITUAL_CHAIN } from '@/lib/ritual-chain';

export const WalletButton = () => {
  const { isConnected, isCorrectChain, address, balance, connect, disconnect, switchToRitual } = useWallet();

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-secondary text-foreground text-sm font-medium hover:border-primary/40 transition-all"
      >
        <Wallet className="w-4 h-4" />
        Connect
      </button>
    );
  }

  if (!isCorrectChain) {
    return (
      <button
        onClick={switchToRitual}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium"
      >
        <Zap className="w-4 h-4" />
        Switch to Ritual
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={RITUAL_CHAIN.faucetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hidden sm:flex text-xs font-mono text-muted-foreground hover:text-primary transition-colors items-center gap-1"
      >
        Faucet <ExternalLink className="w-3 h-3" />
      </a>
      <div className="px-2.5 py-1.5 rounded-md bg-secondary border border-border font-mono text-xs">
        <span className="text-green-400">{formatRitual(balance, 3)}</span>
        <span className="text-muted-foreground ml-1">RITUAL</span>
      </div>
      <button
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-border bg-secondary text-xs font-mono hover:border-primary/40 transition-all"
        onClick={disconnect}
      >
        {shortenAddress(address!)}
        <LogOut className="w-3 h-3 text-muted-foreground" />
      </button>
    </div>
  );
};
