import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/contexts/WalletContext';
import { ethers } from 'ethers';
import { MEMETOKEN_ABI, readTokenOnChainData } from '@/lib/contracts';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ArrowUpDown } from 'lucide-react';

interface TradingPanelProps {
  tokenAddress: string;
  tokenName: string;
  tokenTicker: string;
  currentPrice: string;
  onTradeComplete: () => void;
}

export const TradingPanel = ({
  tokenAddress,
  tokenName,
  tokenTicker,
  currentPrice,
  onTradeComplete,
}: TradingPanelProps) => {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState('5');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [arcBalance, setArcBalance] = useState('0');
  const { signer, address, isConnected, isCorrectChain, provider } = useWallet();

  // Fetch balances
  useEffect(() => {
    if (!provider || !address || !isCorrectChain) return;
    const fetchBalances = async () => {
      try {
        const contract = new ethers.Contract(tokenAddress, MEMETOKEN_ABI, provider);
        const bal = await contract.balanceOf(address);
        setTokenBalance(ethers.formatEther(bal));
        const ethBal = await provider.getBalance(address);
        setArcBalance(ethers.formatEther(ethBal));
      } catch {
        /* ignore */
      }
    };
    fetchBalances();
    const interval = setInterval(fetchBalances, 10000);
    return () => clearInterval(interval);
  }, [provider, address, isCorrectChain, tokenAddress]);

  const price = parseFloat(currentPrice);
  const amountNum = parseFloat(amount) || 0;
  const expected = mode === 'buy'
    ? (price > 0 ? (amountNum / price).toFixed(2) : '0')
    : (amountNum * price).toFixed(6);

  const syncOnChainData = async (contract: ethers.Contract, txHash: string, tradeType: string, tokensTraded: string, arcAmount: string) => {
    try {
      const onChain = await readTokenOnChainData(contract);
      await supabase.from('tokens').update({
        current_price: onChain.currentPrice,
        total_supply: onChain.totalSupply,
        market_cap: onChain.marketCap,
      }).eq('address', tokenAddress);
      await supabase.from('price_snapshots').insert({
        token_address: tokenAddress,
        price: onChain.currentPrice,
        total_supply: onChain.totalSupply,
        market_cap: onChain.marketCap,
      });
      await supabase.from('trades').insert({
        token_address: tokenAddress,
        trader_address: address!,
        type: tradeType,
        amount_tokens: tokensTraded,
        price: onChain.currentPrice,
        total_arc: arcAmount,
        tx_hash: txHash,
      });
    } catch (err) {
      console.error('Failed to sync on-chain data:', err);
    }
  };

  const handleTrade = async () => {
    if (!signer || !address || !amount) return;
    setLoading(true);

    try {
      const contract = new ethers.Contract(tokenAddress, MEMETOKEN_ABI, signer);
      const iface = new ethers.Interface(MEMETOKEN_ABI);

      if (mode === 'buy') {
        const arcAmount = ethers.parseEther(amount);
        const tx = await contract.buy({ value: arcAmount });
        const receipt = await tx.wait();

        let tokensBought = '0';
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed && parsed.name === 'TokensBought') {
              tokensBought = ethers.formatEther(parsed.args.amount);
              break;
            }
          } catch { /* skip */ }
        }

        await syncOnChainData(contract, receipt.hash, 'buy', tokensBought, amount);
        toast.success('🎉 Buy Successful!', {
          description: `Bought ${tokensBought} ${tokenTicker} for ${amount} aUSD`,
        });
      } else {
        const tokenAmount = ethers.parseEther(amount);
        const tx = await contract.sell(tokenAmount);
        const receipt = await tx.wait();

        let arcReceived = '0';
        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
            if (parsed && parsed.name === 'TokensSold') {
              arcReceived = ethers.formatEther(parsed.args.revenue);
              break;
            }
          } catch { /* skip */ }
        }

        await syncOnChainData(contract, receipt.hash, 'sell', amount, arcReceived);
        toast.success('💰 Sell Successful!', {
          description: `Sold ${amount} ${tokenTicker} for ${arcReceived} aUSD`,
        });
      }

      setAmount('');
      onTradeComplete();
    } catch (err: any) {
      toast.error('Transaction Failed', { description: err.message?.slice(0, 100) || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const setPercentage = (pct: number) => {
    const bal = mode === 'sell' ? parseFloat(tokenBalance) : parseFloat(arcBalance);
    if (bal <= 0) return;
    const val = (bal * pct) / 100;
    setAmount(mode === 'sell' ? val.toFixed(0) : val.toFixed(6));
  };

  const displayBalance = mode === 'sell'
    ? parseFloat(tokenBalance).toFixed(2)
    : parseFloat(arcBalance).toFixed(4);
  const balanceUnit = mode === 'sell' ? tokenTicker : 'aUSD';

  return (
    <div className="rounded-xl bg-card border border-border p-5">
      {/* Buy/Sell Toggle */}
      <div className="flex rounded-lg bg-secondary p-1 mb-4">
        <button
          onClick={() => { setMode('buy'); setAmount(''); }}
          className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${
            mode === 'buy'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => { setMode('sell'); setAmount(''); }}
          className={`flex-1 py-2.5 rounded-md text-sm font-semibold transition-all ${
            mode === 'sell'
              ? 'bg-destructive text-destructive-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Sell
        </button>
      </div>

      <div className="space-y-3">
        {/* Balance */}
        <div className="text-xs text-muted-foreground">
          Balance : <span className="text-foreground font-mono">{isConnected ? displayBalance : '-'}</span> {balanceUnit}
        </div>

        {/* Amount Input */}
        <div className="relative">
          <input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-secondary border border-border rounded-lg px-4 py-3 font-mono text-foreground text-base focus:outline-none focus:border-primary transition-colors pr-20"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
            {mode === 'buy' ? 'aUSD' : tokenTicker}
          </span>
        </div>

        {/* Percentage quick buttons */}
        <div className="flex gap-1.5">
          <button
            onClick={() => setAmount('')}
            className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium bg-secondary hover:bg-secondary/80 text-muted-foreground border border-border transition-all"
          >
            Reset
          </button>
          {[25, 50, 75].map(pct => (
            <button
              key={pct}
              onClick={() => setPercentage(pct)}
              className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground border border-border transition-all"
            >
              {pct} %
            </button>
          ))}
          <button
            onClick={() => setPercentage(100)}
            className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-semibold bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground border border-border transition-all"
          >
            Max
          </button>
        </div>

        {/* Expected output */}
        {amountNum > 0 && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-muted-foreground">Expected</span>
            <span className="text-primary font-mono">
              {expected} {mode === 'buy' ? tokenTicker : 'aUSD'}
            </span>
          </div>
        )}

        {/* Slippage */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Slippage</span>
          <div className="flex gap-1 ml-auto">
            {['1', '3', '5', '10'].map(s => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  slippage === s
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary text-muted-foreground border border-border'
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={!isConnected || !isCorrectChain || !amount || loading}
          className={`w-full font-mono text-sm py-5 ${
            mode === 'buy'
              ? 'bg-primary text-primary-foreground hover:bg-primary/80 glow-green'
              : 'bg-destructive text-destructive-foreground hover:bg-destructive/80'
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <ArrowUpDown className="w-4 h-4 mr-2" />
          )}
          {!isConnected
            ? 'Connect Wallet'
            : !isCorrectChain
            ? 'Switch to Arc'
            : loading
            ? 'Processing...'
            : `${mode === 'buy' ? 'Buy' : 'Sell'} ${tokenTicker}`
          }
        </Button>
      </div>
    </div>
  );
};
