import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  Recipe,
  RecipeStatus,
  activateRecipe,
  createRecipe,
  fetchRecipe,
  findRecipePda,
} from '../src';
import { createUmi } from './_setup';

test('it can activate a recipe', async (t) => {
  // Given a paused recipe account.
  const umi = await createUmi();
  const base = generateSigner(umi);
  const [recipe] = findRecipePda(umi, { base: base.publicKey });
  await createRecipe(umi, { base }).sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
  });

  // When we activate the recipe.
  await activateRecipe(umi, { recipe }).sendAndConfirm(umi);

  // Then the recipe account is now marked as active.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
  });
});

test('it cannot activate a recipe as the wrong authority', async (t) => {
  // Given a paused recipe account owned by authority A.
  const umi = await createUmi();
  const base = generateSigner(umi);
  const [recipe] = findRecipePda(umi, { base: base.publicKey });
  const authorityA = generateSigner(umi);
  await createRecipe(umi, {
    base,
    authority: authorityA.publicKey,
  }).sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
  });

  // When authority B tries to activate the recipe.
  const authorityB = generateSigner(umi);
  const promise = activateRecipe(umi, {
    authority: authorityB,
    recipe,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});
