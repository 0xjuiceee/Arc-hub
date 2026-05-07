import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ethers } from 'ethers';
import { FACTORY_ABI } from '@/lib/contracts';
import { FACTORY_BYTECODE } from '@/lib/factory-bytecode';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export const useFactoryAddress = () => {
  const queryClient = useQueryClient();

  const { data: factoryAddress = ZERO_ADDRESS, isLoading } = useQuery({
    queryKey: ['factory-address'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'factory_address')
        .single();
      if (error || !data) return ZERO_ADDRESS;
      return data.value || ZERO_ADDRESS;
    },
    staleTime: 60000,
  });

  const isFactoryReady = factoryAddress !== ZERO_ADDRESS;

  /** Deploy factory on-chain and persist its address. Returns the deployed address. */
  const deployFactory = async (signer: ethers.Signer): Promise<string> => {
    const factory = new ethers.ContractFactory(FACTORY_ABI, FACTORY_BYTECODE, signer);
    const contract = await factory.deploy();
    await contract.waitForDeployment();
    const deployedAddress = await contract.getAddress();

    await supabase
      .from('config')
      .update({ value: deployedAddress, updated_at: new Date().toISOString() })
      .eq('key', 'factory_address');

    queryClient.invalidateQueries({ queryKey: ['factory-address'] });
    return deployedAddress;
  };

  return { factoryAddress, isFactoryReady, isLoading, deployFactory };
};
