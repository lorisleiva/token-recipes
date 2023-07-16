import { Mint, createMint, fetchMint } from '@metaplex-foundation/mpl-toolbox';
import {
  addAmounts,
  assertAccountExists,
  generateSigner,
  isEqualToAmount,
  some,
  subtractAmounts,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  DelegatedIngredient,
  IngredientInput,
  IngredientOutput,
  IngredientRecord,
  IngredientType,
  Recipe,
  RecipeStatus,
  addIngredient,
  fetchDelegatedIngredient,
  fetchIngredientRecord,
  fetchRecipe,
  findDelegatedIngredientPda,
  findIngredientRecordPda,
  removeIngredient,
} from '../src';
import { TX_FEE_TOLERANCE, createRecipe, createUmi } from './_setup';

test('it can remove an ingredient input', async (t) => {
  // Given a recipe with an ingredient input.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      addIngredient(umi, {
        recipe,
        mint: mint.publicKey,
        ingredientType: IngredientType.BurnTokenInput,
      })
    )
    .sendAndConfirm(umi);

  // And given the ingredient record PDA exists for that ingredient input.
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe,
    mint: mint.publicKey,
  });
  t.true(await umi.rpc.accountExists(ingredientRecord));

  // When we remove that ingredient input.
  await removeIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.BurnTokenInput,
  }).sendAndConfirm(umi);

  // Then the recipe account now has no ingredient inputs.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [] as Array<IngredientOutput>,
  });

  // And the ingredient record account was deleted.
  t.false(await umi.rpc.accountExists(ingredientRecord));
});

test('it can remove an ingredient output', async (t) => {
  // Given a recipe with an ingredient output.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      addIngredient(umi, {
        recipe,
        mint: mint.publicKey,
        ingredientType: IngredientType.MintTokenOutput,
      })
    )
    .sendAndConfirm(umi);

  // And given the ingredient record PDA exists for that ingredient output.
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe,
    mint: mint.publicKey,
  });
  t.true(await umi.rpc.accountExists(ingredientRecord));

  // And given the delegated ingredient PDA exists for that ingredient output.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.true(await umi.rpc.accountExists(delegatedIngredient));

  // And given the delegated ingredient PDA is the mint authority of the mint account.
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{
    mintAuthority: some(delegatedIngredient),
  });

  // When we remove that ingredient output.
  await removeIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.MintTokenOutput,
  }).sendAndConfirm(umi);

  // Then the recipe account now has no ingredient outputs.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [] as Array<IngredientOutput>,
  });

  // And the ingredient record account was deleted.
  t.false(await umi.rpc.accountExists(ingredientRecord));

  // And the delegated ingredient account was deleted.
  t.false(await umi.rpc.accountExists(delegatedIngredient));

  // And mint authority was transferred back to the original mint authority.
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{
    mintAuthority: some(umi.identity.publicKey),
  });
});

test('it decrements the counter when removing an ingredient output that is still used in another recipe', async (t) => {
  // Given a recipe A with an ingredient output.
  const umi = await createUmi();
  const recipeA = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      addIngredient(umi, {
        recipe: recipeA,
        mint: mint.publicKey,
        ingredientType: IngredientType.MintTokenOutput,
      })
    )
    .sendAndConfirm(umi);

  // And given that ingredient output is used in another recipe B.
  const recipeB = await createRecipe(umi);
  await addIngredient(umi, {
    recipe: recipeB,
    mint: mint.publicKey,
    ingredientType: IngredientType.MintTokenOutput,
  }).sendAndConfirm(umi);

  // And given the delegated ingredient PDA has a counter of 2.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{ counter: 2 });

  // When we remove that ingredient output from recipe A.
  await removeIngredient(umi, {
    recipe: recipeA,
    mint: mint.publicKey,
    ingredientType: IngredientType.MintTokenOutput,
  }).sendAndConfirm(umi);

  // Then the delegated ingredient PDA now has a counter of 1.
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{ counter: 1 });
});

test('it can remove an ingredient that is both input and output', async (t) => {
  // Given ingredient that is both input and output in a recipe.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      addIngredient(umi, {
        recipe,
        mint: mint.publicKey,
        ingredientType: IngredientType.BurnTokenInput,
      })
    )
    .add(
      addIngredient(umi, {
        recipe,
        mint: mint.publicKey,
        ingredientType: IngredientType.MintTokenOutput,
      })
    )
    .sendAndConfirm(umi);

  // And given the ingredient record PDA shows the ingredient is both input and output.
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe,
    mint: mint.publicKey,
  });
  t.like(await fetchIngredientRecord(umi, ingredientRecord), <IngredientRecord>{
    input: true,
    output: true,
  });

  // When we remove that ingredient as input.
  await removeIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.BurnTokenInput,
  }).sendAndConfirm(umi);

  // Then the recipe and ingredient record accounts now show the ingredient is only an output.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [{ __kind: 'MintToken', mint: mint.publicKey, amount: 1n }],
  });
  t.like(await fetchIngredientRecord(umi, ingredientRecord), <IngredientRecord>{
    input: false,
    output: true,
  });

  // And when we remove that ingredient as output.
  await removeIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.MintTokenOutput,
  }).sendAndConfirm(umi);

  // Then the recipe shows no ingredients.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [] as Array<IngredientOutput>,
  });

  // And the ingredient record account was deleted.
  t.false(await umi.rpc.accountExists(ingredientRecord));
});

test('it cannot remove an ingredient as the wrong authority', async (t) => {
  // Given a recipe owned by authority A with an ingredient input.
  const umi = await createUmi();
  const authorityA = generateSigner(umi);
  const recipe = await createRecipe(umi, { authority: authorityA });
  const mint = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      addIngredient(umi, {
        authority: authorityA,
        recipe,
        mint: mint.publicKey,
        ingredientType: IngredientType.BurnTokenInput,
      })
    )
    .sendAndConfirm(umi);

  // When authority B tries to remove that ingredient.
  const authorityB = generateSigner(umi);
  const promise = removeIngredient(umi, {
    authority: authorityB,
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.BurnTokenInput,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});

test('it cannot remove an ingredient that is not in the recipe', async (t) => {
  // Given an empty recipe and an mint account.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // When we try to remove an ingredient that is not in the recipe.
  const promise = removeIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.BurnTokenInput,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'MissingIngredient' });
});

test('it gives some storage fees back when removing an ingredient', async (t) => {
  // Given a recipe with an ingredient input.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      addIngredient(umi, {
        recipe,
        mint: mint.publicKey,
        ingredientType: IngredientType.BurnTokenInput,
      })
    )
    .sendAndConfirm(umi);

  // And given the recipe, ingredient record and payer have the following balances.
  const rawRecipe = await umi.rpc.getAccount(recipe);
  assertAccountExists(rawRecipe);
  const recipeRent = await umi.rpc.getRent(rawRecipe.data.length);
  const recipeBalance = rawRecipe.lamports;
  const payerBalance = await umi.rpc.getBalance(umi.payer.publicKey);
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe,
    mint: mint.publicKey,
  });
  const ingredientRecordBalance = await umi.rpc.getBalance(ingredientRecord);

  // When we remove that ingredient input.
  await removeIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.BurnTokenInput,
  }).sendAndConfirm(umi);

  // And given we refetch all the rent and balances.
  const newRawRecipe = await umi.rpc.getAccount(recipe);
  assertAccountExists(newRawRecipe);
  const newRecipeRent = await umi.rpc.getRent(newRawRecipe.data.length);
  const newRecipeBalance = newRawRecipe.lamports;
  const newPayerBalance = await umi.rpc.getBalance(umi.payer.publicKey);

  // Then the rent and recipe balance went down.
  t.true(recipeRent.basisPoints > newRecipeRent.basisPoints);
  t.true(recipeBalance.basisPoints > newRecipeBalance.basisPoints);
  const rentDiff = subtractAmounts(recipeRent, newRecipeRent);
  t.true(
    isEqualToAmount(newRecipeBalance, subtractAmounts(recipeBalance, rentDiff))
  );

  // And the payer balance went up.
  t.true(payerBalance.basisPoints < newPayerBalance.basisPoints);
  const expectedSolBack = addAmounts(ingredientRecordBalance, rentDiff);
  t.true(
    isEqualToAmount(
      newPayerBalance,
      addAmounts(payerBalance, expectedSolBack),
      TX_FEE_TOLERANCE
    )
  );
});
