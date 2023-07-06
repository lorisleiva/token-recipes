import {
  Token,
  fetchToken,
  findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import {
  addAmounts,
  assertAccountExists,
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
  collectFees,
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

test('it can collect the accumulated fees and shards of a recipe', async (t) => {
  // Given an recipe with accumulated fees and shards.
  const umi = await createUmi();
  const authority = generateSigner(umi);
  const crafter = generateSigner(umi);
  const [inputMint, outputMint] = await createInputOutputMints(umi, crafter, {
    authority,
  });
  const recipe = await createRecipe(umi, {
    authority,
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

  // And given we keep track of the authority and admin balance before collecting.
  const collectingAccounts = getCollectingAccounts(umi);
  const [authorityBalance, adminBalance] = await Promise.all([
    umi.rpc.getBalance(authority.publicKey),
    umi.rpc.getBalance(collectingAccounts.adminFeesDestination),
  ]);

  // When the authority collects the fees.
  await collectFees(umi, {
    authority,
    recipe,
    ...collectingAccounts,
  }).sendAndConfirm(umi);

  // Then the accumulated fees and shards were reset.
  const [newRecipe, newAuthorityBalance, newAdminBalance] = await Promise.all([
    fetchRecipe(umi, recipe),
    umi.rpc.getBalance(authority.publicKey),
    umi.rpc.getBalance(collectingAccounts.adminFeesDestination),
  ]);
  t.like(newRecipe, <Recipe>{
    accumulatedAdminFees: 0n,
    accumulatedShards: 0n,
    accumulatedExperience: originalRecipe.accumulatedExperience,
  });

  // And the recipe's lamports only have the rent exempt balance.
  const rawRecipe = await umi.rpc.getAccount(recipe);
  t.true(rawRecipe.exists);
  assertAccountExists(rawRecipe);
  const recipeRent = await umi.rpc.getRent(rawRecipe.data.length);
  t.true(isEqualToAmount(newRecipe.header.lamports, recipeRent));

  // And the recipe authority received the rest of the fees.
  const expectedAdminFees = lamports(originalRecipe.accumulatedAdminFees);
  t.true(
    isEqualToAmount(
      newAdminBalance,
      addAmounts(adminBalance, expectedAdminFees)
    )
  );

  // And the admin destination account received the admin fees.
  const expectedAuthorityFees = subtractAmounts(
    originalRecipe.header.lamports,
    addAmounts(recipeRent, expectedAdminFees)
  );
  t.true(
    isEqualToAmount(
      newAuthorityBalance,
      addAmounts(authorityBalance, expectedAuthorityFees)
    )
  );

  // And shards were minted to the recipe authority.
  const ata = findAssociatedTokenPda(umi, {
    mint: collectingAccounts.shardsMint,
    owner: authority.publicKey,
  });
  t.like(await fetchToken(umi, ata), <Token>{
    amount: originalRecipe.accumulatedShards,
  });
});
