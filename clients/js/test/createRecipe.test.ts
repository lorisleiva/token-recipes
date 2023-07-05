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
  findRecipePda,
} from '../src';
import { createUmi } from './_setup';

test('it can create new empty recipes', async (t) => {
  // Given a Umi instance and a new base signer.
  const umi = await createUmi();
  const base = generateSigner(umi);
  const [recipe] = findRecipePda(umi, { base: base.publicKey });

  // When we use it to create a new recipe.
  await createRecipe(umi, { base }).sendAndConfirm(umi);

  // Then a new recipe account was created with the correct data.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    publicKey: recipe,
    key: Key.Recipe,
    base: base.publicKey,
    authority: umi.identity.publicKey,
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: [] as Array<IngredientOutput>,
  });
});
