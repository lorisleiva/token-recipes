import { mplToolbox } from '@metaplex-foundation/mpl-toolbox';
import { UmiPlugin } from '@metaplex-foundation/umi';
import { createTokenRecipesProgram } from './generated';

export const tokenRecipes = (): UmiPlugin => ({
  install(umi) {
    umi.use(mplToolbox());
    umi.programs.add(createTokenRecipesProgram(), false);
  },
});
