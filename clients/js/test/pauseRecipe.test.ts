import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  Recipe,
  RecipeStatus,
  activateRecipe,
  createRecipe,
  fetchRecipe,
  pauseRecipe,
} from '../src';
import { createUmi } from './_setup';

test('it can pause a recipe', async (t) => {
  // Given an active recipe account.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(activateRecipe(umi, { recipe: recipe.publicKey }))
    .sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Active,
  });

  // When we pause the recipe.
  await pauseRecipe(umi, { recipe: recipe.publicKey }).sendAndConfirm(umi);

  // Then the recipe account is now marked as paused.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
  });
});

test('it cannot pause a recipe as the wrong authority', async (t) => {
  // Given an active recipe account owned by authority A.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const authorityA = generateSigner(umi);
  await createRecipe(umi, { recipe, authority: authorityA.publicKey })
    .add(
      activateRecipe(umi, { authority: authorityA, recipe: recipe.publicKey })
    )
    .sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Active,
  });

  // When authority B tries to pause the recipe.
  const authorityB = generateSigner(umi);
  const promise = pauseRecipe(umi, {
    authority: authorityB,
    recipe: recipe.publicKey,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});
