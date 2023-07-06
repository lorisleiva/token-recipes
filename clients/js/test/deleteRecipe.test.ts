import { createMint } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { deleteRecipe, ingredientInput, ingredientOutput } from '../src';
import { getCollectingAccounts, createRecipe, createUmi } from './_setup';

test('it can delete a recipe', async (t) => {
  // Given an empty recipe account.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  t.true(await umi.rpc.accountExists(recipe));

  // When we delete the recipe.
  await deleteRecipe(umi, {
    recipe,
    ...getCollectingAccounts(umi),
  }).sendAndConfirm(umi);

  // Then the recipe account no longer exists.
  t.false(await umi.rpc.accountExists(recipe));
});

test('it cannot delete a recipe as the wrong authority', async (t) => {
  // Given an empty recipe account owned by authority A.
  const umi = await createUmi();
  const authorityA = generateSigner(umi);
  const recipe = await createRecipe(umi, { authority: authorityA });

  // When authority B tries to delete the recipe.
  const authorityB = generateSigner(umi);
  const promise = deleteRecipe(umi, {
    authority: authorityB,
    recipe,
    ...getCollectingAccounts(umi),
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});

test('it cannot delete a recipe that is not empty', async (t) => {
  // Given a recipe with some ingredients.
  const umi = await createUmi();
  const mintA = generateSigner(umi);
  const mintB = generateSigner(umi);
  await createMint(umi, { mint: mintA })
    .add(createMint(umi, { mint: mintB }))
    .sendAndConfirm(umi);
  const recipe = await createRecipe(umi, {
    inputs: [
      ingredientInput('BurnToken', { mint: mintA.publicKey, amount: 2 }),
    ],
    outputs: [
      ingredientOutput('MintToken', { mint: mintB.publicKey, amount: 1 }),
    ],
  });

  // When we try to delete the recipe.
  const promise = deleteRecipe(umi, {
    recipe,
    ...getCollectingAccounts(umi),
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, {
    name: 'RecipeMustBeEmptyBeforeItCanBeDeleted',
  });
});
