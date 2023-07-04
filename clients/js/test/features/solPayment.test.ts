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
import {
  Recipe,
  RecipeStatus,
  craft,
  fetchRecipe,
  findSolPaymentFeaturePda,
  ingredientInput,
  ingredientOutput,
} from '../../src';
import { getUnlockFeatureMacro } from '../_macros';
import { createMintWithHolders, createRecipe, createUmi } from '../_setup';

const unlockMacro = getUnlockFeatureMacro(
  findSolPaymentFeaturePda,
  'solPayment',
  'SOLP',
  'mintBurn5'
);

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn3', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn4', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn5', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn6', 0, 3);
test(unlockMacro, 1, 0, 'mintBurn7', 0, 6);
test(unlockMacro, 1, 0, 'mintBurn8', 0, 10);
test(unlockMacro, 1, 0, 'mintBurn9', 0, 11);
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 0, 'mintSkill2', 1, 3);
test(unlockMacro, 1, 0, 'mintSkill3', 1, 6);
test(unlockMacro, 1, 0, 'mintSkill4', 1, 10);
test(unlockMacro, 1, 0, 'mintSkill5', 1, 11);

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
