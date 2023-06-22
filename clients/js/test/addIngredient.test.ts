import { createMint } from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  IngredientInput,
  IngredientOutput,
  IngredientRecord,
  IngredientType,
  Key,
  Recipe,
  RecipeStatus,
  addIngredient,
  createRecipe,
  fetchIngredientRecordFromSeeds,
  fetchRecipe,
  findDelegatedIngredientPda,
} from '../src';
import { createUmi } from './_setup';

test('it can add an ingredient input', async (t) => {
  // Given an empty recipe.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  await createRecipe(umi, { recipe }).sendAndConfirm(umi);

  // And a mint account.
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // When we add that mint as an ingredient input.
  await addIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then the recipe account now contains that ingredient input.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: <Array<IngredientInput>>[{ mint: mint.publicKey, amount: 1n }],
    outputs: [] as Array<IngredientOutput>,
  });

  // And a new ingredient record account was created.
  t.like(
    await fetchIngredientRecordFromSeeds(umi, {
      mint: mint.publicKey,
      recipe: recipe.publicKey,
    }),
    <IngredientRecord>{
      key: Key.IngredientRecord,
      input: true,
      output: false,
      mint: mint.publicKey,
      recipe: recipe.publicKey,
    }
  );

  // And no delegated ingredient account was created.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.false(await umi.rpc.accountExists(delegatedIngredient));
});
