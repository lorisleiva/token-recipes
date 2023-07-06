import {
  Token,
  createMint,
  fetchToken,
  findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import {
  addAmounts,
  generateSigner,
  isEqualToAmount,
  lamports,
  multiplyAmount,
  subtractAmounts,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  BASE_FEES,
  Recipe,
  craft,
  deleteRecipe,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../src';
import { createRecipe, createUmi, getCollectingAccounts } from './_setup';

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

test('it collects fees, shards and experience when deleting a recipe', async (t) => {
  // Given an empty recipe with accumulated fees, shards and experience.
  const umi = await createUmi();
  const authority = generateSigner(umi);
  const crafter = generateSigner(umi);
  const recipe = await createRecipe(umi, {
    authority,
    active: true,
    features: { fees: 1, wisdom: 1 },
  });
  await craft(umi, { recipe, owner: crafter, quantity: 2 }).sendAndConfirm(umi);
  const originalRecipe = await fetchRecipe(umi, recipe);
  t.like(originalRecipe, <Recipe>{
    accumulatedAdminFees: multiplyAmount(BASE_FEES, 0.9).basisPoints,
    accumulatedShards: multiplyAmount(BASE_FEES, 0.9).basisPoints,
    accumulatedExperience: 125n,
  });

  // And given we keep track of the authority and admin balance before collecting.
  const collectingAccounts = getCollectingAccounts(umi);
  const [authorityBalance, adminBalance] = await Promise.all([
    umi.rpc.getBalance(authority.publicKey),
    umi.rpc.getBalance(collectingAccounts.adminFeesDestination),
  ]);

  // When the authority deletes the recipe.
  await deleteRecipe(umi, {
    authority,
    recipe,
    ...collectingAccounts,
  }).sendAndConfirm(umi);

  // Then the recipe account was deleted.
  const [recipeExists, newAuthorityBalance, newAdminBalance] =
    await Promise.all([
      umi.rpc.accountExists(recipe),
      umi.rpc.getBalance(authority.publicKey),
      umi.rpc.getBalance(collectingAccounts.adminFeesDestination),
    ]);
  t.false(recipeExists);

  // And the admin destination account received the admin fees.
  const expectedAdminFees = lamports(originalRecipe.accumulatedAdminFees);
  t.true(
    isEqualToAmount(
      newAdminBalance,
      addAmounts(adminBalance, expectedAdminFees)
    )
  );

  // And the recipe authority received the rest of the fees.
  const expectedAuthorityFees = subtractAmounts(
    originalRecipe.header.lamports,
    expectedAdminFees
  );
  t.true(
    isEqualToAmount(
      newAuthorityBalance,
      addAmounts(authorityBalance, expectedAuthorityFees)
    )
  );

  // And shards were minted to the recipe authority.
  const shardsAta = findAssociatedTokenPda(umi, {
    mint: collectingAccounts.shardsMint,
    owner: authority.publicKey,
  });
  t.like(await fetchToken(umi, shardsAta), <Token>{
    amount: originalRecipe.accumulatedShards,
  });

  // And experience was minted to the recipe authority.
  const experienceAta = findAssociatedTokenPda(umi, {
    mint: collectingAccounts.experienceMint,
    owner: authority.publicKey,
  });
  t.like(await fetchToken(umi, experienceAta), <Token>{
    amount: originalRecipe.accumulatedExperience,
  });
});
