import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Zap, Rocket, Shield, TrendingUp, ArrowUpRight,
  Sparkles, Layers, Coins, Activity, ChevronRight, Globe, Bird,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

const TWITTER = "https://twitter.com/0xjuiceee";

const projects = [
  { name: "StableSwap X", ticker: "SSX", raise: "120,000 aUSD", progress: 86, status: "Live", category: "DEX" },
  { name: "Voltara Vaults", ticker: "VLT", raise: "75,000 aUSD", progress: 42, status: "Live", category: "Yield" },
  { name: "Arclight Lend", ticker: "ARCL", raise: "200,000 aUSD", progress: 100, status: "Filled", category: "Lending" },
  { name: "Pulse Perps", ticker: "PULSE", raise: "300,000 aUSD", progress: 18, status: "Upcoming", category: "Perps" },
  { name: "Beacon Bridge", ticker: "BCN", raise: "90,000 aUSD", progress: 64, status: "Live", category: "Infra" },
  { name: "Nimbus Pay", ticker: "NMB", raise: "150,000 aUSD", progress: 9, status: "Upcoming", category: "Payments" },
];

const stats = [
  { label: "Total Raised", value: "$2.4M", sub: "across testnet rounds" },
  { label: "Projects Launched", value: "27", sub: "and counting" },
  { label: "Active Builders", value: "1,840", sub: "on Arc testnet" },
  { label: "Avg. Finality", value: "<1s", sub: "deterministic" },
];

const features = [
  { icon: Zap, title: "Stable-Fee Gas", body: "Pay gas in stablecoins. Predictable costs for users and builders, no native token gymnastics." },
  { icon: Shield, title: "Audited Vaults", body: "Every launch flows through programmable, audit-ready vaults with refund and vesting primitives." },
  { icon: Layers, title: "EVM Native", body: "Fully EVM-compatible. Deploy your existing Solidity stack to Arc testnet in minutes." },
  { icon: Activity, title: "Sub-Second Finality", body: "Voltara settles allocations the moment your transaction lands. No waiting, no reorgs." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10" style={{ background: "var(--gradient-radial)" }} />
      <div
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <Nav />
      <Hero />
      <Stats />
      <Features />
      <Launches />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-2 group">
          <ArcMark className="w-7 h-7" />
          <span className="font-display text-xl font-bold tracking-tight">Voltara</span>
          <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full border border-primary/40 text-primary uppercase tracking-widest">
            Arc Testnet
          </span>
        </a>
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#launches" className="hover:text-foreground transition">Launches</a>
          <a href="#features" className="hover:text-foreground transition">Why Voltara</a>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="https://docs.arc.network/arc-chain" target="_blank" rel="noreferrer" className="hover:text-foreground transition">
            Arc Docs
          </a>
        </nav>
        <a
          href={TWITTER}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:scale-[1.02] transition"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          Launch App <ArrowUpRight className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="max-w-4xl"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-3 py-1 text-xs font-mono text-muted-foreground mb-8">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Live on Arc Network Testnet · Chain ID 10242
        </div>
        <h1 className="font-display text-5xl sm:text-7xl md:text-8xl font-extrabold leading-[0.95] tracking-tighter">
          Launch the
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "var(--gradient-arc)" }}
          >
            stablecoin economy.
          </span>
        </h1>
        <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Voltara is the launchpad built for <span className="text-foreground font-semibold">Arc Network</span> — the
          purpose-built L1 with stable-fee gas, sub-second finality and EVM compatibility. Discover, fund, and ship
          the next wave of stablecoin-native dApps on testnet.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href="#launches"
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:scale-[1.02] transition"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            Explore Launches <ChevronRight className="w-4 h-4" />
          </a>
          <a
            href="https://docs.arc.network/arc-chain"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-6 py-3 font-semibold hover:bg-card transition"
          >
            Read Arc Docs <ArrowUpRight className="w-4 h-4" />
          </a>
        </div>
      </motion.div>

      {/* floating arc orb */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, delay: 0.3 }}
        className="hidden lg:block absolute right-0 top-24 w-[420px] h-[420px]"
      >
        <div className="absolute inset-0 rounded-full" style={{ background: "var(--gradient-arc)", filter: "blur(80px)", opacity: 0.4 }} />
        <div
          className="absolute inset-8 rounded-full border border-primary/30"
          style={{ animation: "arc-spin 30s linear infinite" }}
        />
        <div
          className="absolute inset-16 rounded-full border border-accent/30"
          style={{ animation: "arc-spin 20s linear infinite reverse" }}
        />
        <div
          className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32"
          style={{ animation: "arc-float 4s ease-in-out infinite" }}
        >
          <ArcMark className="w-full h-full" />
        </div>
      </motion.div>
    </section>
  );
}

function Stats() {
  return (
    <section className="border-y border-border bg-card/30">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="font-display text-3xl md:text-4xl font-bold text-primary">{s.value}</div>
            <div className="mt-1 text-sm font-semibold">{s.label}</div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-32">
      <div className="max-w-2xl mb-16">
        <div className="text-xs font-mono uppercase tracking-widest text-primary mb-4">Why Voltara</div>
        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          Built on Arc.
          <br />
          Tuned for stablecoins.
        </h2>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-8 hover:border-primary/50 transition"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition" style={{ background: "var(--gradient-arc)", filter: "blur(60px)" }} />
            <f.icon className="w-8 h-8 text-primary mb-6" />
            <h3 className="font-display text-2xl font-bold mb-2">{f.title}</h3>
            <p className="text-muted-foreground leading-relaxed">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function Launches() {
  return (
    <section id="launches" className="max-w-7xl mx-auto px-6 py-32">
      <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
        <div>
          <div className="text-xs font-mono uppercase tracking-widest text-primary mb-4">Live Launches</div>
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">Active rounds</h2>
        </div>
        <div className="text-sm font-mono text-muted-foreground">arc-testnet · refreshed every block</div>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((p, i) => (
          <motion.div
            key={p.ticker}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="group rounded-2xl border border-border bg-card/60 p-6 hover:border-primary/50 hover:-translate-y-1 transition"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center font-display font-bold text-primary-foreground"
                  style={{ background: "var(--gradient-arc)" }}
                >
                  {p.ticker.slice(0, 2)}
                </div>
                <div>
                  <div className="font-display font-bold text-lg leading-tight">{p.name}</div>
                  <div className="text-xs font-mono text-muted-foreground">${p.ticker} · {p.category}</div>
                </div>
              </div>
              <StatusPill status={p.status} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-muted-foreground">Raise</span>
                <span>{p.raise}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${p.progress}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 }}
                  className="h-full rounded-full"
                  style={{ background: "var(--gradient-arc)" }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono pt-1">
                <span className="text-muted-foreground">{p.progress}% filled</span>
                <span className="text-primary group-hover:translate-x-1 transition inline-flex items-center gap-1">
                  Details <ArrowUpRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Live: "text-primary border-primary/40 bg-primary/10",
    Filled: "text-muted-foreground border-border bg-secondary",
    Upcoming: "text-accent border-accent/40 bg-accent/10",
  };
  return (
    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border ${map[status]}`}>
      {status === "Live" && "● "}{status}
    </span>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Globe, title: "Connect to Arc", body: "Add Arc testnet RPC, grab a wallet of testnet aUSD from the faucet." },
    { icon: Sparkles, title: "Pick a launch", body: "Browse vetted projects building on Arc. Read tokenomics, audits, vesting." },
    { icon: Coins, title: "Commit aUSD", body: "Subscribe with stablecoins. Allocations clear instantly with sub-second finality." },
    { icon: Rocket, title: "Claim & ship", body: "Claim tokens once the round closes and follow your projects on testnet." },
  ];
  return (
    <section id="how" className="max-w-7xl mx-auto px-6 py-32">
      <div className="max-w-2xl mb-16">
        <div className="text-xs font-mono uppercase tracking-widest text-primary mb-4">How it works</div>
        <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight">Four steps. One arc.</h2>
      </div>
      <div className="grid md:grid-cols-4 gap-5">
        {steps.map((s, i) => (
          <div key={s.title} className="relative">
            <div className="text-7xl font-display font-bold text-primary/10 absolute -top-6 -left-2 select-none">
              {String(i + 1).padStart(2, "0")}
            </div>
            <div className="relative">
              <s.icon className="w-7 h-7 text-primary mb-4" />
              <h3 className="font-display text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="max-w-7xl mx-auto px-6 pb-32">
      <div
        className="relative overflow-hidden rounded-3xl border border-primary/30 p-12 md:p-20 text-center"
        style={{ background: "linear-gradient(135deg, oklch(0.18 0.025 260), oklch(0.22 0.04 240))" }}
      >
        <div className="absolute inset-0 opacity-30" style={{ background: "var(--gradient-radial)" }} />
        <div className="relative">
          <TrendingUp className="w-10 h-10 text-primary mx-auto mb-6" />
          <h2 className="font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl mx-auto">
            Ready to launch on Arc testnet?
          </h2>
          <p className="mt-6 text-muted-foreground max-w-xl mx-auto">
            Apply your project, or jump in as a contributor. Voltara is open to every builder shipping on Arc.
          </p>
          <div className="mt-10 flex flex-wrap gap-4 justify-center">
            <a
              href={TWITTER}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 font-semibold hover:scale-[1.02] transition"
              style={{ boxShadow: "var(--shadow-glow)" }}
            >
              Apply to launch <ArrowUpRight className="w-4 h-4" />
            </a>
            <a
              href="https://docs.arc.network/arc-chain"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-6 py-3 font-semibold hover:bg-card transition"
            >
              Arc Network docs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <ArcMark className="w-6 h-6" />
          <span className="font-display font-bold">Voltara</span>
          <span className="text-xs font-mono text-muted-foreground ml-2">© 2026 · Arc Testnet</span>
        </div>
        <a
          href={TWITTER}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-3 rounded-full border border-border bg-card/50 pl-2 pr-4 py-2 hover:border-primary/50 transition"
        >
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center"
            style={{ background: "var(--gradient-arc)" }}
          >
            <Bird className="w-3.5 h-3.5 text-primary-foreground" />
          </span>
          <span className="text-sm">
            Built by{" "}
            <span
              className="font-display font-bold text-base bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-arc)" }}
            >
              0xjuiceee
            </span>
          </span>
          <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition" />
        </a>
      </div>
    </footer>
  );
}

function ArcMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none">
      <defs>
        <linearGradient id="arcg" x1="0" y1="0" x2="32" y2="32">
          <stop offset="0%" stopColor="oklch(0.78 0.17 200)" />
          <stop offset="50%" stopColor="oklch(0.6 0.2 280)" />
          <stop offset="100%" stopColor="oklch(0.82 0.16 75)" />
        </linearGradient>
      </defs>
      <path d="M4 24 A 12 12 0 0 1 28 24" stroke="url(#arcg)" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="24" r="2.5" fill="url(#arcg)" />
    </svg>
  );
}
