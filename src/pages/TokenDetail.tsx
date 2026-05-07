import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { useParams, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TradingChart } from '@/components/TradingChart';
import { TradingPanel } from '@/components/TradingPanel';
import { shortenAddress, getExplorerAddressUrl, getExplorerTxUrl, formatRitual } from '@/lib/arc-chain';
import { MEMETOKEN_ABI, readTokenOnChainData } from '@/lib/contracts';
import { useWallet } from '@/contexts/WalletContext';
import { ethers } from 'ethers';
import { ExternalLink, Copy, ArrowLeft, Share2, Zap, Flame, BarChart3, Info, Clock, Camera, Loader2 } from 'lucide-react';

function addressToHue(addr: string): number {
  let hash = 0;
  for (let i = 0; i < addr.length; i++) {
    hash = addr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

type TradeTab = 'trades' | 'holders';

const TokenDetail = () => {
  const { address } = useParams({ strict: false }) as { address: string };
  const { provider, isConnected, isCorrectChain, address: walletAddress } = useWallet();
  const [tradeTab, setTradeTab] = useState<TradeTab>('trades');
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const { data: token, refetch: refetchToken } = useQuery({
    queryKey: ['token', address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('address', address!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!address,
  });

  const { data: onChainData } = useQuery({
    queryKey: ['token-onchain', address, isCorrectChain],
    queryFn: async () => {
      if (!provider || !isCorrectChain) return null;
      try {
        const contract = new ethers.Contract(address!, MEMETOKEN_ABI, provider);
        return await readTokenOnChainData(contract);
      } catch (err) {
        console.error('Failed to read on-chain data:', err);
        return null;
      }
    },
    enabled: !!address && !!provider && isCorrectChain,
    refetchInterval: 10000,
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ['price-history', address],
    queryFn: async () => {
      // Fetch both price_snapshots and trades, merge them for richer chart data
      const [snapRes, tradeRes] = await Promise.all([
        supabase
          .from('price_snapshots')
          .select('*')
          .eq('token_address', address!)
          .order('created_at', { ascending: true })
          .limit(500),
        supabase
          .from('trades')
          .select('*')
          .eq('token_address', address!)
          .order('created_at', { ascending: true })
          .limit(500),
      ]);
      if (snapRes.error) throw snapRes.error;
      if (tradeRes.error) throw tradeRes.error;

      const points: { time: string; price: number; marketCap: number }[] = [];

      // Add snapshot points
      for (const s of snapRes.data) {
        points.push({
          time: s.created_at,
          price: parseFloat(s.price),
          marketCap: parseFloat(s.market_cap),
        });
      }

      // Add trade points (use trade price as the price event)
      for (const t of tradeRes.data) {
        const p = parseFloat(t.price);
        if (p > 0) {
          points.push({
            time: t.created_at,
            price: p,
            marketCap: 0, // will be interpolated from snapshots
          });
        }
      }

      return points;
    },
    enabled: !!address,
    refetchInterval: 15000,
  });

  const { data: recentTrades = [] } = useQuery({
    queryKey: ['token-trades', address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('token_address', address!)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!address,
    refetchInterval: 10000,
  });

  const { data: creatorProfile } = useQuery({
    queryKey: ['creator-profile', token?.creator_address],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('wallet_address', token!.creator_address)
        .single();
      return data;
    },
    enabled: !!token?.creator_address,
  });

  const tradeStats = (() => {
    const buys = recentTrades.filter(t => t.type === 'buy');
    const sells = recentTrades.filter(t => t.type === 'sell');
    const buyVol = buys.reduce((s, t) => s + parseFloat(t.total_ritual), 0);
    const sellVol = sells.reduce((s, t) => s + parseFloat(t.total_ritual), 0);
    const uniqueTraders = new Set(recentTrades.map(t => t.trader_address));
    const uniqueBuyers = new Set(buys.map(t => t.trader_address));
    const uniqueSellers = new Set(sells.map(t => t.trader_address));
    return {
      txns: recentTrades.length,
      buys: buys.length,
      sells: sells.length,
      volume: buyVol + sellVol,
      buyVol,
      sellVol,
      makers: uniqueTraders.size,
      buyers: uniqueBuyers.size,
      sellers: uniqueSellers.size,
    };
  })();

  const isCreator = !!(walletAddress && token?.creator_address &&
    walletAddress.toLowerCase() === token.creator_address.toLowerCase());

  const handleImageUpload = async (file: File) => {
    if (!token || !address) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Invalid file');
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${address}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('token-images')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from('token-images').getPublicUrl(path);
      const image_url = urlData.publicUrl + '?t=' + Date.now();
      const { error: updateErr } = await supabase
        .from('tokens')
        .update({ image_url })
        .eq('address', address);
      if (updateErr) throw updateErr;
      refetchToken();
      toast.success("");
    } catch (err: any) {
      toast.error('Upload failed');
    } finally {
      setUploadingImage(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(address!);
    toast.success("");
  };

  const shareToken = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("");
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (!token) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-card rounded w-1/3" />
          <div className="h-[400px] bg-card rounded-xl" />
        </div>
      </div>
    );
  }

  const displayPrice = onChainData?.currentPrice || token.current_price;
  const displayMarketCap = onChainData?.marketCap || token.market_cap;
  const displaySupply = onChainData?.totalSupply || token.total_supply;
  const supplyNum = parseFloat(displaySupply);
  const bondingProgress = Math.min(100, (supplyNum / 1000000) * 100);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Back */}
      <Link to="/terminal" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
      </Link>

      {/* Token Header */}
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-16 h-16 rounded-xl bg-secondary overflow-hidden flex-shrink-0 border border-border relative group/img cursor-pointer"
          onClick={() => isCreator && imageInputRef.current?.click()}
        >
          {token.image_url ? (
            <img src={token.image_url} alt={token.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary/40" />
            </div>
          )}
          {isCreator && (
            <>
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                {uploadingImage ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImageUpload(file);
                  e.target.value = '';
                }}
              />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
              {token.ticker}
            </span>
            <button onClick={copyAddress} className="text-xs font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors">
              {shortenAddress(token.address)}
              <Copy className="w-3 h-3" />
            </button>
            {onChainData && (
              <span className="text-[10px] text-green-400 bg-green-400/10 border border-green-400/20 px-1.5 py-0.5 rounded font-mono">
                LIVE
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mt-1">{token.name}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>by {shortenAddress(token.creator_address)}</span>
            <span>·</span>
            <span>{timeAgo(token.created_at)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={shareToken}
            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
          <a
            href={getExplorerAddressUrl(token.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:text-foreground transition-colors flex items-center gap-1"
          >
            Explorer <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left */}
        <div className="lg:col-span-2 space-y-4">
          {/* Market Cap bar */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Market Cap</div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {parseFloat(displayMarketCap).toFixed(4)} <span className="text-sm text-muted-foreground">aUSD</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Price</div>
                <div className="text-lg font-mono text-primary">{parseFloat(displayPrice).toFixed(6)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Supply</div>
                <div className="text-lg font-mono">{parseFloat(displaySupply).toFixed(0)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Trades</div>
                <div className="text-lg font-mono">{token.total_trades}</div>
              </div>
            </div>
          </div>

          <TradingChart
            data={chartData}
            trades={recentTrades.map(t => ({
              time: t.created_at,
              totalRitual: parseFloat(t.total_ritual),
              type: t.type,
            }))}
          />

          {/* Trades / Holders */}
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="flex items-center gap-1 px-4 pt-3 pb-0 border-b border-border">
              <button
                onClick={() => setTradeTab('trades')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
                  tradeTab === 'trades'
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Trades
              </button>
              <button
                onClick={() => setTradeTab('holders')}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-all -mb-[1px] ${
                  tradeTab === 'holders'
                    ? 'text-foreground border-primary'
                    : 'text-muted-foreground border-transparent hover:text-foreground'
                }`}
              >
                Holders
              </button>
            </div>

            {tradeTab === 'trades' ? (
              recentTrades.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No trades yet</div>
              ) : (
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-[11px] text-muted-foreground border-b border-border">
                        <th className="text-left px-4 py-2.5">Account</th>
                        <th className="text-left px-4 py-2.5">Type</th>
                        <th className="text-right px-4 py-2.5">Value</th>
                        <th className="text-right px-4 py-2.5">Amount (RITUAL)</th>
                        <th className="text-right px-4 py-2.5">Amount ({token.ticker})</th>
                        <th className="text-right px-4 py-2.5">Time</th>
                        <th className="text-right px-4 py-2.5">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTrades.map(trade => (
                        <tr key={trade.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {shortenAddress(trade.trader_address)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-semibold ${
                              trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.type.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {parseFloat(trade.total_ritual).toFixed(4)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {parseFloat(trade.total_ritual).toFixed(4)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-xs">
                            {parseFloat(trade.amount_tokens).toFixed(2)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">
                            {timeAgo(trade.created_at)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {trade.tx_hash ? (
                              <a
                                href={getExplorerTxUrl(trade.tx_hash)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground/30">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Holder data coming soon
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <TradingPanel
            tokenAddress={token.address}
            tokenName={token.name}
            tokenTicker={token.ticker}
            currentPrice={displayPrice}
            onTradeComplete={refetchToken}
          />

          {/* Bonding Curve */}
          <div className="rounded-xl bg-card border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-foreground">Bonding Curve</span>
              </div>
              <span className="text-xs font-mono text-primary">{bondingProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400 transition-all duration-500"
                style={{ width: `${bondingProgress}%` }}
              />
            </div>
          </div>

          {/* Other Info */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Other Info</span>
            </div>

            {/* Creator */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Creator</span>
              <Link
                to="/profile" search={{ address: token.creator_address }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                {creatorProfile?.avatar_url ? (
                  <img src={creatorProfile.avatar_url} alt="creator" className="w-6 h-6 rounded-full object-cover border border-border" />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full border border-border"
                    style={{
                      background: `linear-gradient(135deg, hsl(${addressToHue(token.creator_address)}, 70%, 50%), hsl(${(addressToHue(token.creator_address) + 60) % 360}, 70%, 40%))`,
                    }}
                  />
                )}
                <span className="text-xs font-mono text-foreground">
                  {creatorProfile?.display_name || shortenAddress(token.creator_address, 4)}
                </span>
              </Link>
            </div>

            {/* Contract Address */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Contract Address</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-foreground">{shortenAddress(token.address, 4)}</span>
                <button onClick={() => { navigator.clipboard.writeText(token.address); toast.success(""); }} className="text-muted-foreground hover:text-primary transition-colors">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Pool Address */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pool Address</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-foreground">
                  {token.bonding_curve_address ? shortenAddress(token.bonding_curve_address, 4) : '—'}
                </span>
                {token.bonding_curve_address && (
                  <button onClick={() => { navigator.clipboard.writeText(token.bonding_curve_address!); toast.success(""); }} className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Creation Time */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Creation Time</span>
              <span className="text-xs font-mono text-foreground">
                {new Date(token.created_at).toLocaleString()}
              </span>
            </div>
          </div>


          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Information</span>
              <span className="text-[10px] font-mono text-muted-foreground">{shortenAddress(token.creator_address)}</span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0 border border-border">
                {token.image_url ? (
                  <img src={token.image_url} alt={token.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary/40" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {token.description || `${token.name} — a memecoin on Ritual Chain`}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">PRICE</div>
                <div className="text-xs font-mono font-semibold">{parseFloat(displayPrice).toFixed(6)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">MCAP</div>
                <div className="text-xs font-mono font-semibold">{parseFloat(displayMarketCap).toFixed(4)}</div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground">SUPPLY</div>
                <div className="text-xs font-mono font-semibold">{parseFloat(displaySupply).toFixed(0)}</div>
              </div>
            </div>
          </div>

          {/* Trade Statistics */}
          <div className="rounded-xl bg-card border border-border p-4 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Trade Stats</span>
            </div>

            <StatBar label="TXNS" total={tradeStats.txns.toString()} leftLabel="BUYS" leftVal={tradeStats.buys} rightLabel="SELLS" rightVal={tradeStats.sells} />
            <StatBar label="VOLUME" total={tradeStats.volume.toFixed(2)} leftLabel="BUY VOL" leftVal={tradeStats.buyVol} rightLabel="SELL VOL" rightVal={tradeStats.sellVol} isRitual />
            <StatBar label="MAKERS" total={tradeStats.makers.toString()} leftLabel="BUYERS" leftVal={tradeStats.buyers} rightLabel="SELLERS" rightVal={tradeStats.sellers} />
          </div>
        </div>
      </div>
    </div>
  );
};

const StatBar = ({
  label,
  total,
  leftLabel,
  leftVal,
  rightLabel,
  rightVal,
  isRitual,
}: {
  label: string;
  total: string;
  leftLabel: string;
  leftVal: number;
  rightLabel: string;
  rightVal: number;
  isRitual?: boolean;
}) => {
  const sum = leftVal + rightVal;
  const leftPct = sum > 0 ? (leftVal / sum) * 100 : 50;
  const fmt = (v: number) => (isRitual ? v.toFixed(2) : v.toString());

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
          <span className="text-xs font-mono font-semibold text-foreground">{total}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-muted-foreground">{leftLabel} <span className="text-foreground font-mono">{fmt(leftVal)}</span></span>
          <span className="text-muted-foreground">{rightLabel} <span className="text-foreground font-mono">{fmt(rightVal)}</span></span>
        </div>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-secondary">
        <div className="bg-green-500 transition-all duration-300" style={{ width: `${leftPct}%` }} />
        <div className="bg-red-500 transition-all duration-300" style={{ width: `${100 - leftPct}%` }} />
      </div>
    </div>
  );
};

export default TokenDetail;
