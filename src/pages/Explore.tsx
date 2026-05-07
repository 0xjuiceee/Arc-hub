import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TokenCard, TokenCardData } from '@/components/TokenCard';
import { Input } from '@/components/ui/input';
import { Search, Flame, Clock, TrendingUp, BarChart3, Zap, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { formatArc, shortenAddress } from '@/lib/arc-chain';
import { useRef } from 'react';

type SortTab = 'latest' | 'mcap' | 'newest' | 'oldest';

const Explore = () => {
  const [tab, setTab] = useState<SortTab>('latest');
  const [search, setSearch] = useState('');
  const trendingRef = useRef<HTMLDivElement>(null);

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['tokens', tab, search],
    queryFn: async () => {
      let query = supabase.from('tokens').select('*');

      if (search) {
        query = query.or(`name.ilike.%${search}%,ticker.ilike.%${search}%,address.ilike.%${search}%`);
      }

      switch (tab) {
        case 'latest':
          query = query.order('total_trades', { ascending: false });
          break;
        case 'mcap':
          query = query.order('market_cap', { ascending: false });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data as TokenCardData[];
    },
    refetchInterval: 10000,
  });

  // Top trending tokens (top 8 by trades)
  const { data: trending = [] } = useQuery({
    queryKey: ['trending-tokens'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tokens')
        .select('*')
        .order('total_trades', { ascending: false })
        .limit(8);
      return (data || []) as TokenCardData[];
    },
    refetchInterval: 15000,
  });

  const scrollTrending = (dir: 'left' | 'right') => {
    trendingRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  const tabs: { key: SortTab; label: string }[] = [
    { key: 'latest', label: 'Latest Trade' },
    { key: 'mcap', label: 'Market Cap' },
    { key: 'newest', label: 'Newest Created' },
    { key: 'oldest', label: 'Oldest Created' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-6">
      {/* Trending Now Section */}
      {trending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            Trending Now <span className="text-xl">🔥</span>
          </h2>
          <div className="relative group">
            <button
              onClick={() => scrollTrending('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div
              ref={trendingRef}
              className="flex gap-3 overflow-x-auto scrollbar-none pb-2"
            >
              {trending.map(token => (
                <Link
                  key={token.id}
                  to="/token/$address" params={{ address: token.address }}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all min-w-[200px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {token.image_url ? (
                      <img src={token.image_url} alt={token.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-primary">{token.ticker}</div>
                    <div className="text-sm font-medium text-foreground truncate">{token.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">
                      MCap:<span className="text-foreground ml-0.5">${formatArc(token.market_cap, 1)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <button
              onClick={() => scrollTrending('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-background/80 border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 flex-wrap">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                tab === t.key
                  ? 'bg-primary/10 text-primary border-primary/20'
                  : 'text-muted-foreground border-border hover:text-foreground hover:border-border'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, ticker, or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-8 text-xs bg-card border-border font-mono"
          />
        </div>
      </div>

      {/* Token Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="aspect-square animate-shimmer" />
              <div className="p-3 space-y-2 bg-card">
                <div className="h-3 w-12 animate-shimmer rounded" />
                <div className="h-4 w-24 animate-shimmer rounded" />
                <div className="h-3 w-full animate-shimmer rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : tokens.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">No tokens yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Be the first to launch a memecoin on Arc-hub!</p>
          <Link
            to="/create"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold glow-purple"
          >
            + Create Token
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {tokens.map((token, i) => (
            <TokenCard key={token.id} token={token} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Explore;
