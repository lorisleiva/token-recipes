import {
  Mint,
  Token,
  fetchMint,
  fetchToken,
} from '@metaplex-foundation/mpl-toolbox';
import {
  generateSigner,
  isEqualToAmount,
  sol,
  subtractAmounts,
} from '@metaplex-foundation/umi';
import test from 'ava';
import { mintFeature, withFeatures } from '../_features';
import {
  Recipe,
  RecipeStatus,
  craft,
  fetchRecipe,
  findSolPaymentFeaturePda,
  ingredientInput,
  ingredientOutput,
  unlockFeature,
} from '../../src';
import { createMintWithHolders, createRecipe, createUmi } from '../_setup';

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
      `SOLP-${mintSeed}`,
      fromTokens
    );

    // When we use it to unlock the additional outputs feature.
    await unlockFeature(umi, {
      recipe,
      featurePda: findSolPaymentFeaturePda(umi),
      mint,
    }).sendAndConfirm(umi);

    // Then the recipe was updated to reflect the new feature level.
    t.like(await fetchRecipe(umi, recipe), <Recipe>{
      featureLevels: { solPayment: toLevel },
    });

    // And the token was burned.
    t.like(await fetchToken(umi, ata), <Token>{
      amount: BigInt(toTokens),
    });
  },
});

test(unlockMacro, 1, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 'mintBurn3', 0, 1);

test('it can craft a recipe with a transfer sol input', async (t) => {
  // Given an output mint not owned by the crafter.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [outputMint, outputToken] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });
  const payerBalance = await umi.rpc.getBalance(umi.payer.publicKey);

  // And a recipe that send 2 SOLs to a destination and mints 1 output token.
  const destination = generateSigner(umi).publicKey;
  const lamports = sol(2).basisPoints;
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('TransferSol', { destination, lamports })],
    outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
  });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
    inputs: [{ __kind: 'TransferSol', destination, lamports }],
    outputs: [{ __kind: 'MintToken', mint: outputMint, amount: 1n }],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'TransferSol', destination }],
    outputs: [{ __kind: 'MintToken', mint: outputMint }],
  }).sendAndConfirm(umi);

  // Then the payer paid for the lamports.
  const newPayerBalance = await umi.rpc.getBalance(umi.payer.publicKey);
  t.true(
    isEqualToAmount(
      newPayerBalance,
      subtractAmounts(payerBalance, sol(2)),
      sol(0.01)
    )
  );

  // And the crafter received 1 output mint.
  t.like(await fetchToken(umi, outputToken), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, outputMint), <Mint>{ supply: 1n });
});
