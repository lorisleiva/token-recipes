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

test('it can unlock via mintBurn1', async (t) => {
  // Given feature PDAs and an existing recipe.
  const umi = await createUmi();
  await withFeatures(umi);
  const recipe = await createRecipe(umi);

  // And given we own a token from a feature mint.
  const { mint, ata } = await mintFeature(
    umi,
    'additionalOutputs-mintBurn1',
    1
  );

  // When we unlock the appropriate feature.
  await unlockFeature(umi, {
    recipe,
    featurePda: findAdditionalOutputsFeaturePda(umi),
    mint,
  }).sendAndConfirm(umi);

  // Then the recipe was updated to reflect the new feature level.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    featureLevels: { additionalOutputs: 1 },
  });

  // And the token was burned.
  t.like(await fetchToken(umi, ata), <Token>{
    amount: 0n,
  });
});
