/* eslint-disable import/no-extraneous-dependencies */
import { closeToken, fetchToken } from '@metaplex-foundation/mpl-toolbox';
import {
  Pda,
  PublicKey,
  Umi,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { FeatureLevels, fetchRecipe, unlockFeature } from '../src';
import { createRecipe, createUmi, mintFeature } from './_setup';

export const getUnlockFeatureMacro = (
  featurePdaFactory: (umi: Umi) => Pda | PublicKey,
  featureKey: keyof FeatureLevels,
  featurePrefix: string,
  featureMaxIncrementalMintBurnSeed: string
) =>
  test.macro({
    title: (
      providedTitle,
      fromTokens: number,
      fromLevel: number,
      mintSeed: string,
      toTokens: number,
      toLevel: number | string
    ) => {
      if (providedTitle) return providedTitle;
      const can = typeof toLevel === 'string' ? 'cannot' : 'can';
      const tokens = fromTokens === 1 ? 'token' : 'tokens';
      return `it ${can} unlock using ${fromTokens} ${mintSeed} ${tokens} from level ${fromLevel}`;
    },
    exec: async (
      t,
      fromTokens: number,
      fromLevel: number,
      mintSeed: string,
      toTokens: number,
      toLevel: number
    ) => {
      // Given feature PDAs and an existing recipe.
      const umi = await createUmi();
      const recipe = await createRecipe(umi);
      const featurePda = featurePdaFactory(umi);

      // And given the recipe has the required initial feature level.
      if (fromLevel > 0) {
        const { mint: maxMint, ata: ataMax } = await mintFeature(
          umi,
          `${featurePrefix}-${featureMaxIncrementalMintBurnSeed}`,
          fromLevel
        );
        let builder = transactionBuilder();
        for (let i = 0; i < fromLevel; i += 1) {
          builder = builder.add(
            unlockFeature(umi, { recipe, featurePda, mint: maxMint })
          );
        }
        builder = builder.add(
          closeToken(umi, {
            account: ataMax,
            destination: umi.identity.publicKey,
            owner: umi.identity,
          })
        );
        await builder.sendAndConfirm(umi);
      }
      let recipeAccount = await fetchRecipe(umi, recipe);
      t.is(recipeAccount.featureLevels[featureKey], fromLevel);

      // And given we own a token from a feature mint.
      const { mint, ata } = await mintFeature(
        umi,
        `${featurePrefix}-${mintSeed}`,
        fromTokens
      );

      // When we use it to unlock the additional outputs feature.
      await unlockFeature(umi, {
        recipe,
        featurePda,
        mint,
      }).sendAndConfirm(umi);

      // Then the recipe was updated to reflect the new feature level.
      recipeAccount = await fetchRecipe(umi, recipe);
      t.is(recipeAccount.featureLevels[featureKey], toLevel);

      // And the token account was also potentially updated.
      const tokenAccount = await fetchToken(umi, ata);
      t.is(tokenAccount.amount, BigInt(toTokens));
    },
  });
