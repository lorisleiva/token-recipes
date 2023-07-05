import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  Recipe,
  RecipeStatus,
  activateRecipe,
  fetchRecipe,
  findRecipePda,
  pauseRecipe,
  createRecipe,
} from '../src';
import { createUmi } from './_setup';

test('it can pause a recipe', async (t) => {
  // Given an active recipe account.
  const umi = await createUmi();
  const base = generateSigner(umi);
  const [recipe] = findRecipePda(umi, { base: base.publicKey });
  await createRecipe(umi, { base })
    .add(activateRecipe(umi, { recipe }))
    .sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
  });

  // When we pause the recipe.
  await pauseRecipe(umi, { recipe }).sendAndConfirm(umi);

  // Then the recipe account is now marked as paused.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
  });
});

test('it cannot pause a recipe as the wrong authority', async (t) => {
  // Given an active recipe account owned by authority A.
  const umi = await createUmi();
  const base = generateSigner(umi);
  const [recipe] = findRecipePda(umi, { base: base.publicKey });
  const authorityA = generateSigner(umi);
  await createRecipe(umi, { base, authority: authorityA.publicKey })
    .add(activateRecipe(umi, { authority: authorityA, recipe }))
    .sendAndConfirm(umi);
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
  });

  // When authority B tries to pause the recipe.
  const authorityB = generateSigner(umi);
  const promise = pauseRecipe(umi, {
    authority: authorityB,
    recipe,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});
