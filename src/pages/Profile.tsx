import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWallet } from '@/contexts/WalletContext';
import { Link } from '@tanstack/react-router';
import { ethers } from 'ethers';
import { MEMETOKEN_ABI } from '@/lib/contracts';
import { Wallet, Copy, Check, ExternalLink, Camera, X, Loader2 } from 'lucide-react';
import { shortenAddress, getExplorerTxUrl } from '@/lib/arc-chain';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Tab = 'holdings' | 'created' | 'history';

const tabs: { key: Tab; label: string }[] = [
  { key: 'holdings', label: 'Holdings' },
  { key: 'created', label: 'Created Tokens' },
  { key: 'history', label: 'Trade History' },
];

function addressToHue(addr: string): number {
  let hash = 0;
  for (let i = 0; i < addr.length; i++) {
    hash = addr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

const Profile = () => {
  const { address: walletAddress, isConnected, provider, isCorrectChain } = useWallet();
  const sp = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const viewingAddress = sp.get('address') || walletAddress;
  const isOwnProfile = !sp.get('address') || sp.get('address')?.toLowerCase() === walletAddress?.toLowerCase();
  const address = viewingAddress;

  const [activeTab, setActiveTab] = useState<Tab>('holdings');
  const [copied, setCopied] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const copyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast({ title: 'Address copied!' });
    setTimeout(() => setCopied(false), 2000);
  };

  // ─── Profile query ───
  const { data: profile } = useQuery({
    queryKey: ['profile', address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', address!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!address,
  });

  // ─── Holdings query ───
  const { data: holdings = [], isLoading: holdingsLoading } = useQuery({
    queryKey: ['portfolio', address, isCorrectChain],
    queryFn: async () => {
      const { data: trades, error } = await supabase
        .from('trades')
        .select('*')
        .eq('trader_address', address!)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const tokenMap = new Map<string, { buys: number; sells: number; totalSpent: number; totalReceived: number }>();
      trades.forEach(t => {
        const existing = tokenMap.get(t.token_address) || { buys: 0, sells: 0, totalSpent: 0, totalReceived: 0 };
        if (t.type === 'buy') {
          existing.buys++;
          existing.totalSpent += parseFloat(t.total_ritual);
        } else {
          existing.sells++;
          existing.totalReceived += parseFloat(t.total_ritual);
        }
        tokenMap.set(t.token_address, existing);
      });

      const addresses = [...tokenMap.keys()];
      if (addresses.length === 0) return [];

      const { data: tokens, error: tokenErr } = await supabase
        .from('tokens')
        .select('*')
        .in('address', addresses);
      if (tokenErr) throw tokenErr;

      const results = await Promise.all(
        tokens.map(async (token) => {
          let onChainBalance = '0';
          if (provider && isCorrectChain) {
            try {
              const contract = new ethers.Contract(token.address, MEMETOKEN_ABI, provider);
              const bal = await contract.balanceOf(address!);
              onChainBalance = ethers.formatEther(bal);
            } catch {
              // fallback
            }
          }
          return { ...token, stats: tokenMap.get(token.address)!, onChainBalance };
        })
      );
      return results;
    },
    enabled: !!address,
    refetchInterval: 15000,
  });

  // ─── Created tokens query ───
  const { data: createdTokens = [], isLoading: createdLoading } = useQuery({
    queryKey: ['created-tokens', address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .eq('creator_address', address!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!address && activeTab === 'created',
  });

  // ─── Trade history query ───
  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ['trade-history', address],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('trader_address', address!)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!address && activeTab === 'history',
  });

  const { data: tokenNameMap = {} } = useQuery({
    queryKey: ['token-names', trades.map(t => t.token_address)],
    queryFn: async () => {
      const addrs = [...new Set(trades.map(t => t.token_address))];
      if (addrs.length === 0) return {};
      const { data, error } = await supabase
        .from('tokens')
        .select('address, name, ticker')
        .in('address', addrs);
      if (error) throw error;
      const map: Record<string, { name: string; ticker: string }> = {};
      data.forEach(t => { map[t.address] = { name: t.name, ticker: t.ticker }; });
      return map;
    },
    enabled: trades.length > 0,
  });

  if (!address) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <Wallet className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Connect Wallet</h2>
        <p className="text-muted-foreground">Connect your MetaMask wallet to view your profile</p>
      </div>
    );
  }

  const hue = addressToHue(address!);
  const displayName = profile?.display_name || '';
  const avatarUrl = profile?.avatar_url || '';

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8 space-y-6">
      {/* ─── Profile Header Card ─── */}
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="w-14 h-14 rounded-full flex-shrink-0 object-cover"
          />
        ) : (
          <div
            className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-white"
            style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 60) % 360}, 70%, 40%))` }}
          >
            {address!.slice(2, 4).toUpperCase()}
          </div>
        )}

        {/* Name & Address */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">
            {displayName || shortenAddress(address!, 8)}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-sm text-muted-foreground font-mono truncate">{address}</span>
            <button
              onClick={copyAddress}
              className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Edit button — only for own profile */}
        {isOwnProfile && (
          <button
            onClick={() => setEditOpen(true)}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Edit
          </button>
        )}
      </div>

      {/* ─── Edit Profile Dialog ─── */}
      <EditProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        walletAddress={address!}
        currentName={displayName}
        currentAvatar={avatarUrl}
        hue={hue}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['profile', address] });
        }}
      />

      {/* ─── Tabs + Content ─── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex border-b border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'holdings' && <HoldingsTab holdings={holdings} isLoading={holdingsLoading} />}
          {activeTab === 'created' && <CreatedTokensTab tokens={createdTokens} isLoading={createdLoading} />}
          {activeTab === 'history' && <TradeHistoryTab trades={trades} tokenMap={tokenNameMap} isLoading={tradesLoading} />}
        </div>
      </div>
    </div>
  );
};

/* ─── Edit Profile Dialog ─── */
function EditProfileDialog({
  open,
  onOpenChange,
  walletAddress,
  currentName,
  currentAvatar,
  hue,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  walletAddress: string;
  currentName: string;
  currentAvatar: string;
  hue: number;
  onSaved: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [previewUrl, setPreviewUrl] = useState(currentAvatar);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sync state when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName(currentName);
      setPreviewUrl(currentAvatar);
      setSelectedFile(null);
    }
    onOpenChange(v);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatarUrl = currentAvatar;

      // Upload new avatar if selected
      if (selectedFile) {
        const ext = selectedFile.name.split('.').pop() || 'png';
        const path = `${walletAddress}/${Date.now()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('profile-pictures')
          .upload(path, selectedFile, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from('profile-pictures')
          .getPublicUrl(path);
        avatarUrl = urlData.publicUrl;
      }

      // Upsert profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          wallet_address: walletAddress,
          display_name: name.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;

      toast({ title: 'Profile updated!' });
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error saving profile', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              {previewUrl ? (
                <img src={previewUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                  style={{ background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 60) % 360}, 70%, 40%))` }}
                >
                  {walletAddress.slice(2, 4).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-xs text-muted-foreground">Click to change avatar</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>

          {/* Display name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter a display name..."
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              maxLength={32}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Holdings Tab ─── */
function HoldingsTab({ holdings, isLoading }: { holdings: any[]; isLoading: boolean }) {
  if (isLoading) return <TableSkeleton />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left px-5 py-3">Token</th>
            <th className="text-left px-5 py-3">Status</th>
            <th className="text-right px-5 py-3">Market Cap</th>
            <th className="text-right px-5 py-3">Balance</th>
          </tr>
        </thead>
        <tbody>
          {holdings.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-12 text-primary text-sm">No results.</td></tr>
          ) : (
            holdings.map(h => (
              <tr key={h.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3">
                  <Link to="/token/$address" params={{ address: h.address }} className="hover:text-primary transition-colors">
                    <span className="font-medium text-foreground">{h.name}</span>
                    <span className="text-xs font-mono text-primary ml-1.5">${h.ticker}</span>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">Active</span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm">{parseFloat(h.market_cap).toFixed(4)} RITUAL</td>
                <td className="px-5 py-3 text-right font-mono text-sm">{parseFloat(h.onChainBalance) > 0 ? parseFloat(h.onChainBalance).toFixed(2) : '0'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Created Tokens Tab ─── */
function CreatedTokensTab({ tokens, isLoading }: { tokens: any[]; isLoading: boolean }) {
  if (isLoading) return <TableSkeleton />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left px-5 py-3">Token</th>
            <th className="text-left px-5 py-3">Status</th>
            <th className="text-right px-5 py-3">Market Cap</th>
            <th className="text-right px-5 py-3">Total Trades</th>
          </tr>
        </thead>
        <tbody>
          {tokens.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-12 text-primary text-sm">No results.</td></tr>
          ) : (
            tokens.map(t => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="px-5 py-3">
                  <Link to="/token/$address" params={{ address: t.address }} className="hover:text-primary transition-colors">
                    <span className="font-medium text-foreground">{t.name}</span>
                    <span className="text-xs font-mono text-primary ml-1.5">${t.ticker}</span>
                  </Link>
                </td>
                <td className="px-5 py-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">Active</span>
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm">{parseFloat(t.market_cap).toFixed(4)} RITUAL</td>
                <td className="px-5 py-3 text-right font-mono text-sm">{t.total_trades}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Trade History Tab ─── */
function TradeHistoryTab({ trades, tokenMap, isLoading }: { trades: any[]; tokenMap: Record<string, { name: string; ticker: string }>; isLoading: boolean }) {
  if (isLoading) return <TableSkeleton />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-muted-foreground border-b border-border">
            <th className="text-left px-5 py-3">Token</th>
            <th className="text-left px-5 py-3">Type</th>
            <th className="text-right px-5 py-3">Amount</th>
            <th className="text-right px-5 py-3">Price</th>
            <th className="text-right px-5 py-3">Total</th>
            <th className="text-right px-5 py-3">Tx</th>
            <th className="text-right px-5 py-3">Time</th>
          </tr>
        </thead>
        <tbody>
          {trades.length === 0 ? (
            <tr><td colSpan={7} className="text-center py-12 text-primary text-sm">No results.</td></tr>
          ) : (
            trades.map(trade => {
              const info = tokenMap[trade.token_address];
              return (
                <tr key={trade.id} className="border-b border-border/50 hover:bg-secondary/30">
                  <td className="px-5 py-3">
                    <span className="font-medium text-foreground">{info?.name || shortenAddress(trade.token_address)}</span>
                    {info && <span className="text-xs font-mono text-primary ml-1">${info.ticker}</span>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${trade.type === 'buy' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                      {trade.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono text-sm">{trade.amount_tokens}</td>
                  <td className="px-5 py-3 text-right font-mono text-sm">{parseFloat(trade.price).toFixed(8)}</td>
                  <td className="px-5 py-3 text-right font-mono text-sm">{trade.total_ritual} RITUAL</td>
                  <td className="px-5 py-3 text-right">
                    {trade.tx_hash ? (
                      <a href={getExplorerTxUrl(trade.tx_hash)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1 text-xs">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-muted-foreground">{new Date(trade.created_at).toLocaleString()}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-5 space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 rounded-lg bg-secondary/50 animate-pulse" />
      ))}
    </div>
  );
}

export default Profile;
