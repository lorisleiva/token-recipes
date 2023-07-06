import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  Recipe,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../../src';
import { getUnlockFeatureMacro } from '../_macros';
import { createMintWithHolders, createRecipe, createUmi } from '../_setup';

const unlockMacro = getUnlockFeatureMacro('wisdom');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 3, 'mintBurn1', 0, 4);
test(unlockMacro, 1, 4, 'mintBurn1', 1, 4, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 5, 'mintBurn2', 0, 6);
test(unlockMacro, 1, 6, 'mintBurn2', 1, 6, 'max-level-reached');

// take experience macro.
// Check level 10 and custom fees < base fees + level 11.

test('it adds experience to the recipe when crafting by default', async (t) => {
  // Given an output mint and output mint such that the craft owns 10 input tokens.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [inputMint] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 10 }],
  });
  const [outputMint] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a new recipe with no accumulated experience that uses these mints as ingredients.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 5 })],
    outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
  });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{ accumulatedExperience: 0n });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: inputMint }],
    outputs: [{ __kind: 'MintToken', mint: outputMint }],
    quantity: 2,
  }).sendAndConfirm(umi);

  // Then the recipe has accumulated experience regardless of the quantity.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    accumulatedExperience: 100n,
  });
});

test('it adds more experience to the recipe when crafting when unlocked', async (t) => {
  // Given an output mint and output mint such that the craft owns 10 input tokens.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [inputMint] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 10 }],
  });
  const [outputMint] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a new recipe with no accumulated experience that uses these mints as ingredients.
  // And given the recipe has unlocked the wisdom feature to level 1.
  const recipe = await createRecipe(umi, {
    active: true,
    features: { wisdom: 1 },
    inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 5 })],
    outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
  });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{ accumulatedExperience: 0n });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: inputMint }],
    outputs: [{ __kind: 'MintToken', mint: outputMint }],
    quantity: 2,
  }).sendAndConfirm(umi);

  // Then the recipe has accumulated more experience.
  // Still regardless of the quantity.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    accumulatedExperience: 125n,
  });
});
