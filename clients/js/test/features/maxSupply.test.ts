import { createMint } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  IngredientOutput,
  IngredientType,
  Recipe,
  addIngredient,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../../src';
import { getUnlockFeatureMacro } from '../_macros';
import { createMintWithHolders, createRecipe, createUmi } from '../_setup';

const unlockMacro = getUnlockFeatureMacro('maxSupply');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 1, 'mintBurn1', 1, 1, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 1, 'mintSkill1', 1, 1, 'max-level-reached');

test.skip('it cannot add max supply outputs by default', async (t) => {
  // Given a mint account.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // And a recipe that hasn't unlocked max supply outputs.
  const recipe = await createRecipe(umi);

  // When we try to add a max supply output ingredient.
  const promise = addIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.MintTokenWithMaxSupplyOutput,
    maxSupply: 1_000_000n,
    amount: 2n,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidMaxSupplyFeature' });

  // And the recipe still has no output ingredients.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    outputs: <Array<IngredientOutput>>[],
  });
});

test('it can add max supply outputs when unlocked', async (t) => {
  // Given a mint account.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // And a recipe that unlocked max supply outputs.
  const recipe = await createRecipe(umi, {
    features: [['maxSupply', 1]],
  });

  // When we add a max supply output ingredient.
  await addIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.MintTokenWithMaxSupplyOutput,
    maxSupply: 1_000_000n,
    amount: 2n,
  }).sendAndConfirm(umi);

  // Then the recipe has the output ingredient.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    outputs: <Array<IngredientOutput>>[
      {
        __kind: 'MintTokenWithMaxSupply',
        mint: mint.publicKey,
        maxSupply: 1_000_000n,
        amount: 2n,
      },
    ],
  });
});

test('it cannot craft a recipe if an output has reached its maximum supply', async (t) => {
  // Given 2 mint accounts A and B, such that a crafter owns:
  // - 4 tokens of mint A
  // - 90 tokens of mint B
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 4 }],
  });
  const [mintB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 90 }],
  });

  // And a recipe that uses 2 mint A and outputs 6 mint B with a maximum supply of 100.
  // And given that recipe has unlocked max supply outputs.
  const recipe = await createRecipe(umi, {
    active: true,
    features: [['maxSupply', 1]],
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 2 })],
    outputs: [
      ingredientOutput('MintTokenWithMaxSupply', {
        mint: mintB,
        amount: 6,
        maxSupply: 100,
      }),
    ],
  });

  // When the crafter tries to crafts the recipe twice
  // which would result in mint B reaching its maximum supply (102).
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: mintA }],
    outputs: [{ __kind: 'MintTokenWithMaxSupply', mint: mintB }],
    quantity: 2,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'MaximumSupplyReached' });
});
