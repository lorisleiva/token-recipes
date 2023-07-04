import { Token, fetchToken } from '@metaplex-foundation/mpl-toolbox';
import test from 'ava';
import {
  Recipe,
  fetchRecipe,
  findAdditionalOutputsFeaturePda,
  unlockFeature,
} from '../../src';
import { mintFeature, withFeatures } from '../_features';
import { createRecipe, createUmi } from '../_setup';

const unlockMacro = test.macro({
  title: (providedTitle, _: number, mintSeed: string) =>
    providedTitle ?? `it can unlock using ${mintSeed} tokens`,
  exec: async (
    t,
    fromTokens: number,
    mintSeed: string,
    toTokens: number,
    toLevel: number
  ) => {
    // Given feature PDAs and an existing recipe.
    const umi = await createUmi();
    await withFeatures(umi);
    const recipe = await createRecipe(umi);

    // And given we own a token from a feature mint.
    const { mint, ata } = await mintFeature(
      umi,
      `additionalOutputs-${mintSeed}`,
      fromTokens
    );

    // When we use it to unlock the additional outputs feature.
    await unlockFeature(umi, {
      recipe,
      featurePda: findAdditionalOutputsFeaturePda(umi),
      mint,
    }).sendAndConfirm(umi);

    // Then the recipe was updated to reflect the new feature level.
    t.like(await fetchRecipe(umi, recipe), <Recipe>{
      featureLevels: { additionalOutputs: toLevel },
    });

    // And the token was burned.
    t.like(await fetchToken(umi, ata), <Token>{
      amount: BigInt(toTokens),
    });
  },
});

test(unlockMacro, 1, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 'mintSkill1', 1, 2);
test(unlockMacro, 1, 'mintSkill2', 1, 3);
