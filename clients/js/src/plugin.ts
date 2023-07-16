import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { PublicKey, UmiPlugin } from '@metaplex-foundation/umi';
import { createTokenRecipesProgram } from './generated';

export const tokenRecipes = (): UmiPlugin => ({
  install(umi) {
    umi.use(mplToolbox());
    umi.programs.add(createTokenRecipesProgram(), false);
    umi.programs.add({
      ...createTokenRecipesProgram(),
      publicKey: 'C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T' as PublicKey,
      isOnCluster: (cluster) => cluster === 'localnet',
    });
  },
});
