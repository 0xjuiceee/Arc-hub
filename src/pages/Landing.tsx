import { Link } from '@tanstack/react-router';
import { Rocket, Zap, TrendingUp, Shield, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';
import logoImg from '@/assets/arc-logo.png';

const features = [
  {
    icon: Rocket,
    title: 'Launch Tokens',
    desc: 'Create and deploy your own memecoin on Arc Network in seconds.',
  },
  {
    icon: TrendingUp,
    title: 'Bonding Curve Trading',
    desc: 'Fair price discovery through an automated bonding curve mechanism.',
  },
  {
    icon: Zap,
    title: 'Instant Trades',
    desc: 'Buy and sell tokens instantly with low gas fees on Arc Network.',
  },
  {
    icon: Shield,
    title: 'On-Chain & Transparent',
    desc: 'All trades are fully on-chain. No rugs, no hidden fees.',
  },
];

type RibbonLayer = {
  amplitude: number;
  thickness: number;
  speed: number;
  offset: number;
  phase: number;
  opacity: number;
  blur: number;
};

const PremiumWaveCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let time = 0;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const layers: RibbonLayer[] = [
      { amplitude: 26, thickness: 118, speed: 0.32, offset: -34, phase: 0.2, opacity: 0.18, blur: 34 },
      { amplitude: 38, thickness: 88, speed: 0.46, offset: -10, phase: 1.1, opacity: 0.26, blur: 26 },
      { amplitude: 30, thickness: 64, speed: 0.58, offset: 10, phase: 2.3, opacity: 0.34, blur: 18 },
      { amplitude: 20, thickness: 38, speed: 0.78, offset: 24, phase: 0.8, opacity: 0.52, blur: 10 },
    ];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const yAt = (x: number, width: number, centerY: number, layer: RibbonLayer, t: number) => {
      const n = x / width;
      const waveA = Math.sin(n * Math.PI * 2.1 + t * layer.speed + layer.phase) * layer.amplitude;
      const waveB = Math.sin(n * Math.PI * 4.2 - t * layer.speed * 0.65 + layer.phase * 1.8) * layer.amplitude * 0.24;
      const arch = Math.sin(n * Math.PI) * 14;
      return centerY + layer.offset + waveA + waveB - arch;
    };

    const drawRibbon = (width: number, height: number, centerY: number, layer: RibbonLayer, t: number) => {
      const left = width * 0.08;
      const right = width * 0.92;
      const gradient = ctx.createLinearGradient(left, centerY, right, centerY);
      gradient.addColorStop(0, `hsla(265, 100%, 52%, 0)`);
      gradient.addColorStop(0.2, `hsla(262, 95%, 62%, ${layer.opacity * 0.9})`);
      gradient.addColorStop(0.5, `hsla(274, 100%, 78%, ${layer.opacity})`);
      gradient.addColorStop(0.8, `hsla(262, 95%, 62%, ${layer.opacity * 0.9})`);
      gradient.addColorStop(1, `hsla(265, 100%, 52%, 0)`);

      ctx.save();
      ctx.beginPath();
      for (let x = left; x <= right; x += 8) {
        const y = yAt(x, width, centerY, layer, t) - layer.thickness / 2;
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      for (let x = right; x >= left; x -= 8) {
        const y = yAt(x, width, centerY, layer, t) + layer.thickness / 2;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.shadowColor = `hsla(268, 100%, 68%, ${layer.opacity})`;
      ctx.shadowBlur = layer.blur;
      ctx.fill();
      ctx.restore();
    };

    const drawFilaments = (width: number, centerY: number, t: number) => {
      const left = width * 0.14;
      const right = width * 0.86;
      ctx.save();
      ctx.lineCap = 'round';
      for (let i = 0; i < 18; i += 1) {
        const offset = (i - 8.5) * 2.8;
        const alpha = 0.045 + (i % 3) * 0.01;
        ctx.beginPath();
        ctx.strokeStyle = `hsla(272, 100%, 88%, ${alpha})`;
        ctx.lineWidth = i % 4 === 0 ? 1.2 : 0.8;
        for (let x = left; x <= right; x += 10) {
          const n = x / width;
          const y =
            centerY +
            offset +
            Math.sin(n * Math.PI * 2.3 + t * 0.62 + i * 0.24) * 10 +
            Math.sin(n * Math.PI * 4.6 - t * 0.34 + i * 0.12) * 3;
          if (x === left) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawCoreGlow = (width: number, height: number, centerY: number, t: number) => {
      const glowX = width * 0.5 + Math.sin(t * 0.45) * 20;
      const radial = ctx.createRadialGradient(glowX, centerY, 0, glowX, centerY, width * 0.17);
      radial.addColorStop(0, 'hsla(278, 100%, 88%, 0.75)');
      radial.addColorStop(0.18, 'hsla(270, 100%, 76%, 0.42)');
      radial.addColorStop(0.52, 'hsla(265, 95%, 56%, 0.18)');
      radial.addColorStop(1, 'hsla(265, 95%, 56%, 0)');
      ctx.fillStyle = radial;
      ctx.beginPath();
      ctx.ellipse(glowX, centerY, width * 0.22, height * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    const render = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerY = Math.min(height * 0.48, 360);
      const visualTime = prefersReducedMotion ? 1.2 : time;

      ctx.clearRect(0, 0, width, height);
      drawCoreGlow(width, height, centerY, visualTime);

      ctx.globalCompositeOperation = 'screen';
      layers.forEach((layer) => drawRibbon(width, height, centerY, layer, visualTime));
      drawFilaments(width, centerY, visualTime);
      ctx.globalCompositeOperation = 'source-over';

      const bottomFade = ctx.createLinearGradient(0, 0, 0, height);
      bottomFade.addColorStop(0, 'hsla(240, 6%, 7%, 0.08)');
      bottomFade.addColorStop(0.68, 'hsla(240, 6%, 7%, 0.2)');
      bottomFade.addColorStop(0.88, 'hsla(240, 6%, 7%, 0.82)');
      bottomFade.addColorStop(1, 'hsla(240, 6%, 7%, 1)');
      ctx.fillStyle = bottomFade;
      ctx.fillRect(0, 0, width, height);

      if (!prefersReducedMotion) {
        time += 0.012;
        animationId = window.requestAnimationFrame(render);
      }
    };

    resize();
    render();
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />;
};

const Landing = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(265_90%_60%_/_0.08),transparent_42%)]" />
        <div className="absolute inset-x-0 top-0 h-[72vh]">
          <PremiumWaveCanvas />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-background/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/35 via-transparent to-background" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Arc-hub" className="h-8 w-8 rounded-lg object-cover" />
          <span className="text-xl font-bold text-foreground">
            Arc<span className="text-primary">Pad</span>
          </span>
        </div>
        <Link
          to="/terminal"
          className="rounded-lg border border-primary/30 px-5 py-2 text-sm font-semibold text-primary transition-all hover:bg-primary/10"
        >
          Launch App
        </Link>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center px-6 pb-20 pt-16 text-center md:pt-28">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
          <Zap className="h-3.5 w-3.5" />
          Powered by Arc Network
        </div>

        <h1 className="mb-6 max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl md:text-7xl">
          The Memecoin Terminal
          <br />
          <span className="text-glow text-primary">for Arc Network</span>
        </h1>

        <p className="mb-10 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Launch, discover, and trade memecoins with an automated bonding curve.
          Fair launches, instant trades, fully on-chain.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <Link
            to="/terminal"
            className="glow-purple-strong group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground transition-all duration-200 hover:scale-105"
          >
            Get Started
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-semibold text-foreground transition-all hover:border-primary/30 hover:text-primary"
          >
            Create Token
          </Link>
        </div>
      </main>

      <section className="relative z-10 mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-xl border border-border bg-card/50 p-6 backdrop-blur-sm transition-all hover:border-primary/20"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                <f.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{f.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-6 text-center">
        <p className="text-xs text-muted-foreground">© 2026 Arc-hub — Built on Arc Network Testnet</p>
      </footer>
    </div>
  );
};

export default Landing;
