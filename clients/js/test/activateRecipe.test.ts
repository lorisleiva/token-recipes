import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  Recipe,
  RecipeStatus,
  activateRecipe,
  createRecipe,
  fetchRecipe,
} from '../src';
import { createUmi } from './_setup';

test('it can activate a recipe', async (t) => {
  // Given a paused recipe account.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  await createRecipe(umi, { recipe }).sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
  });

  // When we activate the recipe.
  await activateRecipe(umi, { recipe: recipe.publicKey }).sendAndConfirm(umi);

  // Then the recipe account is now marked as active.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Active,
  });
});

test('it cannot activate a recipe as the wrong authority', async (t) => {
  // Given a paused recipe account owned by authority A.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const authorityA = generateSigner(umi);
  await createRecipe(umi, {
    recipe,
    authority: authorityA.publicKey,
  }).sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
  });

  // When authority B tries to activate the recipe.
  const authorityB = generateSigner(umi);
  const promise = activateRecipe(umi, {
    authority: authorityB,
    recipe: recipe.publicKey,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});
