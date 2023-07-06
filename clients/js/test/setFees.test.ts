import { sol } from '@metaplex-foundation/umi';
import test from 'ava';
import { BASE_FEES, Recipe, fetchRecipe, setFees } from '../src';
import { createRecipe, createUmi } from './_setup';

test('it cannot set the fees of a recipe by default', async (t) => {
  // Given a recipe that has not unlocked custom fees.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    featureLevels: { fees: 0 },
    fees: 0n,
  });

  // When we try to set custom fees.
  const promise = setFees(umi, {
    recipe,
    fees: sol(0.5).basisPoints,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidFeesFeature' });
});

test('it can set the fees of a recipe when unlocked', async (t) => {
  // Given a recipe that has unlocked custom fees.
  const umi = await createUmi();
  const recipe = await createRecipe(umi, { features: { fees: 10 } });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    featureLevels: { fees: 10 },
    fees: BASE_FEES.basisPoints,
  });

  // When we set custom fees.
  await setFees(umi, {
    recipe,
    fees: sol(0.5).basisPoints,
  }).sendAndConfirm(umi);

  // Then the recipe account was updated accordingly.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    fees: sol(0.5).basisPoints,
  });
});
