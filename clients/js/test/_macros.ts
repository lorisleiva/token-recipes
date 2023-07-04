/* eslint-disable import/no-extraneous-dependencies */
import { fetchToken } from '@metaplex-foundation/mpl-toolbox';
import test from 'ava';
import { fetchRecipe, unlockFeature } from '../src';
import {
  createRecipe,
  createUmi,
  featureConfigs,
  mintFeature,
  setFeatureLevel,
} from './_setup';

export const getUnlockFeatureMacro = (feature: string) => {
  const featureConfig = featureConfigs[feature];
  return test.macro({
    title: (
      providedTitle,
      fromTokens: number,
      fromLevel: number,
      mintSeed: string,
      toTokens: number,
      toLevel: number,
      error?: 'invalid-mint' | 'max-level-reached'
    ) => {
      if (providedTitle) return providedTitle;
      const can = error ? 'cannot' : 'can';
      const tokens = fromTokens === 1 ? 'token' : 'tokens';
      return `it ${can} unlock using ${fromTokens} ${mintSeed} ${tokens} from level ${fromLevel}`;
    },
    exec: async (
      t,
      fromTokens: number,
      fromLevel: number,
      mintSeed: string,
      toTokens: number,
      toLevel: number,
      error?: string
    ) => {
      // Given feature PDAs and an existing recipe.
      const umi = await createUmi();
      const recipe = await createRecipe(umi);
      const featurePda = featureConfig.pdaFactory(umi);

      // And given the recipe has the required initial feature level.
      if (fromLevel > 0) {
        await setFeatureLevel(umi, recipe, feature, fromLevel);
      }
      let recipeAccount = await fetchRecipe(umi, recipe);
      t.is(
        recipeAccount.featureLevels[featureConfig.featureLevelKey],
        fromLevel
      );

      // And given we own a token from a feature mint.
      const { mint, ata } = await mintFeature(
        umi,
        `${featureConfig.seedPrefix}-${mintSeed}`,
        fromTokens
      );

      // When we use it to unlock the additional outputs feature.
      const promise = unlockFeature(umi, {
        recipe,
        featurePda,
        mint,
      }).sendAndConfirm(umi);

      if (!error) {
        // Then we expect the transaction to succeed.
        await promise;
      } else if (error === 'invalid-mint') {
        // Then we expect a program error.
        await t.throwsAsync(promise, { name: 'InvalidMintToLevelUpFeature' });
      } else {
        // Then we expect a program error.
        await t.throwsAsync(promise, { name: 'MaxFeatureLevelReached' });
      }

      // And the recipe has the expected feature level.
      recipeAccount = await fetchRecipe(umi, recipe);
      t.is(recipeAccount.featureLevels[featureConfig.featureLevelKey], toLevel);

      // And the token account has the expected amount.
      const tokenAccount = await fetchToken(umi, ata);
      t.is(tokenAccount.amount, BigInt(toTokens));
    },
  });
};
