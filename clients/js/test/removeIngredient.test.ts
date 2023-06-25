import { Mint, createMint, fetchMint } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner, some } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  DelegatedIngredient,
  IngredientInput,
  IngredientOutput,
  IngredientRecord,
  IngredientType,
  MAX_U64,
  Recipe,
  RecipeStatus,
  addIngredient,
  createRecipe,
  fetchDelegatedIngredient,
  fetchIngredientRecord,
  fetchRecipe,
  findDelegatedIngredientPda,
  findIngredientRecordPda,
  removeIngredient,
} from '../src';
import { createUmi } from './_setup';

test('it can remove an ingredient input', async (t) => {
  // Given a recipe with an ingredient input.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint }))
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Input,
      })
    )
    .sendAndConfirm(umi);

  // And given the ingredient record PDA exists for that ingredient input.
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
  });
  t.true(await umi.rpc.accountExists(ingredientRecord));

  // When we remove that ingredient input.
  await removeIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then the recipe account now has no ingredient inputs.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
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
  const recipe = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint }))
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // And given the ingredient record PDA exists for that ingredient output.
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe: recipe.publicKey,
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
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then the recipe account now has no ingredient outputs.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
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
  const recipeA = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe: recipeA })
    .add(createMint(umi, { mint }))
    .add(
      addIngredient(umi, {
        recipe: recipeA.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // And given that ingredient output is used in another recipe B.
  const recipeB = generateSigner(umi);
  await createRecipe(umi, { recipe: recipeB })
    .add(
      addIngredient(umi, {
        recipe: recipeB.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // And given the delegated ingredient PDA has a counter of 2.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{ counter: 2 });

  // When we remove that ingredient output from recipe A.
  await removeIngredient(umi, {
    recipe: recipeA.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then the delegated ingredient PDA now has a counter of 1.
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{ counter: 1 });
});

test('it can remove an ingredient that is both input and output', async (t) => {
  // Given ingredient that is both input and output in a recipe.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint }))
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Input,
      })
    )
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // And given the ingredient record PDA shows the ingredient is both input and output.
  const [ingredientRecord] = findIngredientRecordPda(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
  });
  t.like(await fetchIngredientRecord(umi, ingredientRecord), <IngredientRecord>{
    input: true,
    output: true,
  });

  // When we remove that ingredient as input.
  await removeIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then the recipe and ingredient record accounts now show the ingredient is only an output.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [{ mint: mint.publicKey, amount: 1n, maxSupply: MAX_U64 }],
  });
  t.like(await fetchIngredientRecord(umi, ingredientRecord), <IngredientRecord>{
    input: false,
    output: true,
  });

  // And when we remove that ingredient as output.
  await removeIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then the recipe shows no ingredients.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
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
  const recipe = generateSigner(umi);
  const authorityA = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe, authority: authorityA.publicKey })
    .add(createMint(umi, { mint }))
    .add(
      addIngredient(umi, {
        authority: authorityA,
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Input,
      })
    )
    .sendAndConfirm(umi);

  // When authority B tries to remove that ingredient.
  const authorityB = generateSigner(umi);
  const promise = removeIngredient(umi, {
    authority: authorityB,
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});

test('it cannot remove an ingredient that is not in the recipe', async (t) => {
  // Given an empty recipe and an mint account.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint }))
    .sendAndConfirm(umi);

  // When we try to remove an ingredient that is not in the recipe.
  const promise = removeIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidProgramOwner' });
});
