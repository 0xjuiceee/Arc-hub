import { toast } from 'sonner';
import { useState, useRef } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { ethers } from 'ethers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/contexts/WalletContext';
import { supabase } from '@/integrations/supabase/client';
import { FACTORY_ABI, DEFAULT_BASE_PRICE, DEFAULT_SLOPE } from '@/lib/contracts';
import { useFactoryAddress } from '@/hooks/useFactoryAddress';
import { Loader2, Rocket, Zap, AlertTriangle, ImagePlus, X } from 'lucide-react';

type DeployStep = 'idle' | 'deploying-factory' | 'creating-token' | 'uploading-image' | 'saving';

const stepLabels: Record<DeployStep, string> = {
  idle: '',
  'deploying-factory': 'Deploying Factory (first time only)...',
  'creating-token': 'Creating Token on Ritual...',
  'uploading-image': 'Uploading Image...',
  saving: 'Saving to Arc-hub...',
};

const CreateToken = () => {
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<DeployStep>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { signer, address, isConnected, isCorrectChain } = useWallet();
  const navigate = useNavigate();
  const { factoryAddress, isFactoryReady, deployFactory } = useFactoryAddress();

  const handleImageSelect = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB allowed', variant: 'destructive' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Only images allowed', variant: 'destructive' });
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const removeImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async () => {
    if (!signer || !address || !name || !ticker) return;

    if (name.length > 50 || ticker.length > 10) {
      toast({ title: 'Invalid input', description: 'Name max 50 chars, ticker max 10', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Step 1: Ensure factory is deployed
      let currentFactory = factoryAddress;
      if (!isFactoryReady) {
        setStep('deploying-factory');
        currentFactory = await deployFactory(signer);
        toast({ title: '✅ Factory deployed!', description: 'Now creating your token...' });
      }

      // Step 2: Create token via factory
      setStep('creating-token');
      const factory = new ethers.Contract(currentFactory, FACTORY_ABI, signer);
      const tx = await factory.createToken(name, ticker.toUpperCase(), description || '');
      const receipt = await tx.wait();

      // Parse TokenCreated event
      const iface = new ethers.Interface(FACTORY_ABI);
      let tokenAddress = '';
      for (const log of receipt.logs) {
        try {
          const parsed = iface.parseLog({ topics: log.topics as string[], data: log.data });
          if (parsed && parsed.name === 'TokenCreated') {
            tokenAddress = parsed.args.tokenAddress;
            break;
          }
        } catch {
          // not our event
        }
      }
      if (!tokenAddress) throw new Error('TokenCreated event not found');

      // Step 3: Upload image
      let image_url: string | null = null;
      if (imageFile) {
        setStep('uploading-image');
        const ext = imageFile.name.split('.').pop() || 'png';
        const path = `${tokenAddress}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('token-images')
          .upload(path, imageFile, { contentType: imageFile.type, upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('token-images').getPublicUrl(path);
          image_url = urlData.publicUrl;
        }
      }

      // Step 4: Save to DB
      setStep('saving');
      await supabase.from('tokens').insert({
        address: tokenAddress,
        name,
        ticker: ticker.toUpperCase(),
        description: description || '',
        creator_address: address,
        base_price: DEFAULT_BASE_PRICE.toString(),
        slope: DEFAULT_SLOPE.toString(),
        current_price: '0.0001',
        market_cap: '0',
        volume_24h: '0',
        total_supply: '0',
        total_trades: 0,
        image_url,
      });

      toast({
        title: '🚀 Token Deployed!',
        description: `${name} ($${ticker.toUpperCase()}) is live on Ritual testnet!`,
      });

      navigate({ to: "/token/$address", params: { address: tokenAddress } });
    } catch (err: any) {
      toast({
        title: 'Deployment Failed',
        description: err.message?.slice(0, 120) || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setStep('idle');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 glow-purple">
          <Rocket className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground">Launch Token</h1>
        <p className="text-muted-foreground mt-2">Deploy your memecoin in one click on Ritual testnet</p>
      </div>

      <div className="rounded-xl bg-card border border-border p-6 space-y-5">
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Token Name *</label>
          <Input
            placeholder="e.g. RitualDoge"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={50}
            className="bg-secondary border-border font-mono"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Ticker Symbol *</label>
          <Input
            placeholder="e.g. RDOGE"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            maxLength={10}
            className="bg-secondary border-border font-mono uppercase"
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Description</label>
          <Textarea
            placeholder="Describe your memecoin..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={500}
            className="bg-secondary border-border resize-none"
            rows={3}
          />
        </div>

        {/* Token Image Upload */}
        <div>
          <label className="text-sm text-muted-foreground mb-1.5 block">Token Image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleImageSelect(f);
            }}
          />
          {imagePreview ? (
            <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-primary/30 group">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3 text-foreground" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-border hover:border-primary/40 bg-secondary/50 flex flex-col items-center justify-center gap-1 transition-colors"
            >
              <ImagePlus className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Max 5MB</span>
            </button>
          )}
        </div>

        {/* Bonding Curve Info */}
        <div className="rounded-lg bg-secondary/50 border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Bonding Curve</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <span className="text-muted-foreground">Base Price:</span>
              <span className="text-foreground ml-1">0.0001 RITUAL</span>
            </div>
            <div>
              <span className="text-muted-foreground">Slope:</span>
              <span className="text-foreground ml-1">0.000001 / token</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Formula:</span>
              <span className="text-primary ml-1">price = base + slope × supply</span>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        {loading && step !== 'idle' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-primary font-mono">{stepLabels[step]}</span>
          </div>
        )}

        {!isConnected && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive">Connect your wallet to deploy</span>
          </div>
        )}

        <Button
          onClick={handleCreate}
          disabled={!isConnected || !isCorrectChain || !name || !ticker || loading}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/80 glow-purple font-mono text-base h-12"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {step === 'deploying-factory' ? 'Deploying Factory...' : 'Creating Token...'}
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 mr-2" />
              Deploy Token
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default CreateToken;
