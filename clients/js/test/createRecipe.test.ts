import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  IngredientInput,
  IngredientOutput,
  Key,
  Recipe,
  RecipeStatus,
  createRecipe,
  fetchRecipe,
} from '../src';
import { createUmi } from './_setup';

test('it can create new empty recipes', async (t) => {
  // Given a Umi instance and a new signer.
  const umi = await createUmi();
  const recipe = generateSigner(umi);

  // When we create a new recipe.
  await createRecipe(umi, { recipe }).sendAndConfirm(umi);

  // Then a new recipe account was created with the correct data.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    publicKey: recipe.publicKey,
    key: Key.Recipe,
    authority: umi.identity.publicKey,
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [] as Array<IngredientOutput>,
  });
});
