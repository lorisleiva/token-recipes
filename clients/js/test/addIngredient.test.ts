import { Mint, createMint, fetchMint } from '@metaplex-foundation/mpl-toolbox';
import {
  generateSigner,
  some,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  DelegatedIngredient,
  IngredientInput,
  IngredientOutput,
  IngredientRecord,
  IngredientType,
  Key,
  Recipe,
  RecipeStatus,
  addIngredient,
  createRecipe,
  fetchDelegatedIngredient,
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

test('it can add an ingredient output', async (t) => {
  // Given an empty recipe.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  await createRecipe(umi, { recipe }).sendAndConfirm(umi);

  // And a mint account.
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // When we add that mint as an ingredient output.
  await addIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then the recipe account now contains that ingredient output.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: <Array<IngredientOutput>>[
      {
        mint: mint.publicKey,
        amount: 1n,
        maxSupply: BigInt('0xffffffffffffffff'),
      },
    ],
  });

  // And a new ingredient record account was created.
  t.like(
    await fetchIngredientRecordFromSeeds(umi, {
      mint: mint.publicKey,
      recipe: recipe.publicKey,
    }),
    <IngredientRecord>{
      key: Key.IngredientRecord,
      input: false,
      output: true,
      mint: mint.publicKey,
      recipe: recipe.publicKey,
    }
  );

  // And a new delegated ingredient account was created.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{
    key: Key.DelegatedIngredient,
    mint: mint.publicKey,
    counter: 1,
  });

  // And the mint authority was transferred to the delegated ingredient PDA.
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{
    mintAuthority: some(delegatedIngredient),
  });
});

test('it can add an ingredient as both input and output', async (t) => {
  // Given an empty recipe.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  await createRecipe(umi, { recipe }).sendAndConfirm(umi);

  // And a mint account.
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // When we add that mint as an ingredient input and output.
  await transactionBuilder()
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Input,
      })
    )
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // Then the recipe account now contains that ingredient as both input and output.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: <Array<IngredientInput>>[{ mint: mint.publicKey, amount: 1n }],
    outputs: <Array<IngredientOutput>>[
      {
        mint: mint.publicKey,
        amount: 1n,
        maxSupply: BigInt('0xffffffffffffffff'),
      },
    ],
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
      output: true,
      mint: mint.publicKey,
      recipe: recipe.publicKey,
    }
  );

  // And a new delegated ingredient account was created.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{
    key: Key.DelegatedIngredient,
    mint: mint.publicKey,
    counter: 1,
  });

  // And the mint authority was transferred to the delegated ingredient PDA.
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{
    mintAuthority: some(delegatedIngredient),
  });
});

// it increments the counter when adding the same ingredient output to another recipe
// it can add a specific amount of an ingredient input and output
// it can add a max supply to an ingredient output

// it cannot add an ingredient as the wrong authority
// it cannot add an ingredient input that is already an input
// it cannot add an ingredient output that is already an output
// it cannot add an ingredient output if the authority is not its mint authority

// Remove:

// it can remove an ingredient input
// it can remove an ingredient output
// it decrements the counter when removing an ingredient output that is still used in another recipe
// it can remove an ingredient that is both input and output

// it cannot remove an ingredient from another recipe
// it cannot remove an ingredient as the wrong authority
