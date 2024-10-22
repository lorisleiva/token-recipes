import {
  Mint,
  Token,
  createMint,
  fetchMint,
  fetchToken,
} from '@metaplex-foundation/mpl-toolbox';
import {
  addAmounts,
  generateSigner,
  isEqualToAmount,
  sol,
  subtractAmounts,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  BASE_FEES,
  IngredientInput,
  IngredientType,
  Recipe,
  RecipeStatus,
  addIngredient,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../../src';
import { getUnlockFeatureMacro } from '../_macros';
import { createMintWithHolders, createRecipe, createUmi } from '../_setup';

const unlockMacro = getUnlockFeatureMacro('solPayment');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 1, 'mintBurn1', 1, 1, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 2, 'mintBurn2', 0, 3);
test(unlockMacro, 1, 3, 'mintBurn2', 1, 3, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn3', 0, 1);
test(unlockMacro, 1, 5, 'mintBurn3', 0, 6);
test(unlockMacro, 1, 6, 'mintBurn3', 1, 6, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn4', 0, 1);
test(unlockMacro, 1, 9, 'mintBurn4', 0, 10);
test(unlockMacro, 1, 10, 'mintBurn4', 1, 10, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn5', 0, 1);
test(unlockMacro, 1, 10, 'mintBurn5', 0, 11);
test(unlockMacro, 1, 11, 'mintBurn5', 1, 11, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintBurn6', 0, 3);
test(unlockMacro, 1, 3, 'mintBurn6', 1, 3, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn7', 0, 6);
test(unlockMacro, 1, 6, 'mintBurn7', 1, 6, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn8', 0, 10);
test(unlockMacro, 1, 10, 'mintBurn8', 1, 10, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn9', 0, 11);
test(unlockMacro, 1, 11, 'mintBurn9', 1, 11, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 1, 'mintSkill1', 1, 1, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill2', 1, 3);
test(unlockMacro, 1, 3, 'mintSkill2', 1, 3, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill3', 1, 6);
test(unlockMacro, 1, 6, 'mintSkill3', 1, 6, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill4', 1, 10);
test(unlockMacro, 1, 10, 'mintSkill4', 1, 10, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill5', 1, 11);
test(unlockMacro, 1, 11, 'mintSkill5', 1, 11, 'max-level-reached');

test('it cannot add transfer sol inputs by default', async (t) => {
  // Given a mint account.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // And a recipe that hasn't unlocked sol payments.
  const recipe = await createRecipe(umi);

  // When we try to add a transfer sol ingredient.
  const destination = generateSigner(umi).publicKey;
  const promise = addIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    destination,
    ingredientType: IngredientType.TransferSolInput,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidSolPaymentFeature' });

  // And the recipe still has no input ingredients.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    inputs: <Array<IngredientInput>>[],
  });
});

test('it can add a transfer sol ingredient input when unlocked', async (t) => {
  // Given a recipe that unlocked sol payments and a mint account.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);
  const recipe = await createRecipe(umi, {
    features: { solPayment: 1 },
  });

  // When we add that mint as a transfer sol input ingredient.
  const destination = generateSigner(umi).publicKey;
  await addIngredient(umi, {
    recipe,
    destination,
    ingredientType: IngredientType.TransferSolInput,
    amount: sol(1).basisPoints,
  }).sendAndConfirm(umi);

  // Then the recipe now has that ingredient.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    inputs: <Array<IngredientInput>>[
      {
        __kind: 'TransferSol',
        lamports: sol(1).basisPoints,
        destination,
      },
    ],
  });
});

test('it can craft a recipe with a transfer sol input', async (t) => {
  // Given an output mint not owned by the crafter.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [outputMint, outputToken] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });
  const payerBalance = await umi.rpc.getBalance(umi.payer.publicKey);

  // And a recipe that send 2 SOLs to a destination and mints 1 output token.
  // And the recipe has unlocked sol payments to the appropriate level.
  const destination = generateSigner(umi).publicKey;
  const lamports = sol(2).basisPoints;
  const recipe = await createRecipe(umi, {
    active: true,
    features: { solPayment: 2 },
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
      addAmounts(BASE_FEES, sol(0.01)) // recipe fees and tx fees.
    )
  );

  // And the crafter received 1 output mint.
  t.like(await fetchToken(umi, outputToken), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, outputMint), <Mint>{ supply: 1n });
});
