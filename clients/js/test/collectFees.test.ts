import { generateSigner, multiplyAmount } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  BASE_FEES,
  Recipe,
  collectFees,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../src';
import {
  createInputOutputMints,
  createUmi,
  createRecipe,
  collectingAccounts,
} from './_setup';

test('it can collect the accumulated fees and shards of a recipe', async (t) => {
  // Given an recipe with accumulated fees and shards.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [inputMint, outputMint] = await createInputOutputMints(umi, crafter);
  const recipe = await createRecipe(umi, {
    active: true,
    features: { fees: 1 },
    inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
  });
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: inputMint }],
    outputs: [{ __kind: 'MintToken', mint: outputMint }],
    quantity: 2,
  }).sendAndConfirm(umi);
  const originalRecipe = await fetchRecipe(umi, recipe);
  t.like(originalRecipe, <Recipe>{
    accumulatedAdminFees: multiplyAmount(BASE_FEES, 0.9).basisPoints,
    accumulatedShards: multiplyAmount(BASE_FEES, 0.9).basisPoints,
  });

  // When
  await collectFees(umi, {
    recipe,
    ...collectingAccounts(umi),
  }).sendAndConfirm(umi);

  // Then the admin destination account received the admin fees.

  // And the recipe authority received the rest of the fees.

  // And shards were minted to the recipe authority.

  // And the accumulated fees and shards were reset.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    accumulatedAdminFees: 0n,
    accumulatedShards: 0n,
    accumulatedExperience: originalRecipe.accumulatedExperience,
  });
});
