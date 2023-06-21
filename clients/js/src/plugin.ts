import { UmiPlugin } from '@metaplex-foundation/umi';
import { createTokenRecipesProgram } from './generated';

export const tokenRecipes = (): UmiPlugin => ({
  install(umi) {
    umi.programs.add(createTokenRecipesProgram(), false);
  },
});
