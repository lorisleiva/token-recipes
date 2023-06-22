import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  IngredientInput,
  IngredientOutput,
  IngredientType,
  Recipe,
  RecipeStatus,
  addIngredient,
  createRecipe,
  fetchRecipe,
} from '../src';
import { createUmi } from './_setup';

test('it can add an ingredient input', async (t) => {
  // Given an empty recipe.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  await createRecipe(umi, { recipe }).sendAndConfirm(umi);

  // When we add an ingredient input.
  const mint = generateSigner(umi);
  await addIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    amount: 1,
    maxSupply: null,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then a new recipe account was created with the correct data.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: <Array<IngredientInput>>[{ mint: mint.publicKey, amount: 1n }],
    outputs: [] as Array<IngredientOutput>,
  });
});
