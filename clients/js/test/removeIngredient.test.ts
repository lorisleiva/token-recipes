import { createMint } from '@metaplex-foundation/mpl-toolbox';
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

// it can remove an ingredient output
// it decrements the counter when removing an ingredient output that is still used in another recipe
// it can remove an ingredient that is both input and output

// it cannot remove an ingredient from another recipe
// it cannot remove an ingredient as the wrong authority
