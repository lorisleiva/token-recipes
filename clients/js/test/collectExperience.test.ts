import {
  Token,
  fetchToken,
  findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  Recipe,
  collectExperience,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../src';
import {
  createInputOutputMints,
  createRecipe,
  createUmi,
  getCollectingAccounts,
} from './_setup';

test('it can collect the accumulated experience of a recipe', async (t) => {
  // Given an recipe with accumulated experience.
  const umi = await createUmi();
  const authority = generateSigner(umi);
  const crafter = generateSigner(umi);
  const [inputMint, outputMint] = await createInputOutputMints(umi, crafter, {
    authority,
  });
  const recipe = await createRecipe(umi, {
    authority,
    active: true,
    features: { wisdom: 1 },
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
    accumulatedExperience: 125n,
  });

  // When the authority collects the experience.
  const collectingAccounts = getCollectingAccounts(umi);
  await collectExperience(umi, {
    authority,
    recipe,
    ...collectingAccounts,
  }).sendAndConfirm(umi);

  // Then the accumulated experience was reset.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{ accumulatedExperience: 0n });

  // And experience was minted to the recipe authority.
  const ata = findAssociatedTokenPda(umi, {
    mint: collectingAccounts.experienceMint,
    owner: authority.publicKey,
  });
  t.like(await fetchToken(umi, ata), <Token>{
    amount: originalRecipe.accumulatedExperience,
  });
});
