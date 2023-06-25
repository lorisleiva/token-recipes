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
  MAX_U64,
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
        maxSupply: MAX_U64,
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
        maxSupply: MAX_U64,
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

test('it increments the counter when adding the same ingredient output to another recipe', async (t) => {
  // Given an a mint account and 2 recipes.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  const recipeA = generateSigner(umi);
  const recipeB = generateSigner(umi);
  await createMint(umi, { mint })
    .add(createRecipe(umi, { recipe: recipeA }))
    .add(createRecipe(umi, { recipe: recipeB }))
    .sendAndConfirm(umi);

  // When we add that mint as an ingredient output to both recipes.
  await transactionBuilder()
    .add(
      addIngredient(umi, {
        recipe: recipeA.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .add(
      addIngredient(umi, {
        recipe: recipeB.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // Then the delegated ingredient PDA account has a counter of 2.
  const [delegatedIngredient] = findDelegatedIngredientPda(umi, {
    mint: mint.publicKey,
  });
  t.like(await fetchDelegatedIngredient(umi, delegatedIngredient), <
    DelegatedIngredient
  >{
    key: Key.DelegatedIngredient,
    mint: mint.publicKey,
    counter: 2,
  });
});

test('it can add a specific amount of an ingredient input and output', async (t) => {
  // Given an empty recipe and two mint accounts.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const mintA = generateSigner(umi);
  const mintB = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint: mintA }))
    .add(createMint(umi, { mint: mintB }))
    .sendAndConfirm(umi);

  // When we add 2 mintA tokens as input and 3 mintB tokens as output.
  await transactionBuilder()
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mintA.publicKey,
        ingredientType: IngredientType.Input,
        amount: 2,
      })
    )
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mintB.publicKey,
        ingredientType: IngredientType.Output,
        amount: 3,
      })
    )
    .sendAndConfirm(umi);

  // Then the recipe account contains the correct amounts.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: <Array<IngredientInput>>[{ mint: mintA.publicKey, amount: 2n }],
    outputs: <Array<IngredientOutput>>[
      {
        mint: mintB.publicKey,
        amount: 3n,
        maxSupply: MAX_U64,
      },
    ],
  });
});

test.todo('it can add a destination to an ingredient input');

test('it can add a max supply to an ingredient output', async (t) => {
  // Given an empty recipe and a mint account.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint }))
    .sendAndConfirm(umi);

  // When we add that mint as an ingredient output with a max supply.
  await addIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
    maxSupply: 100,
  }).sendAndConfirm(umi);

  // Then the recipe account stores the max supply for that ingredient.
  t.like(await fetchRecipe(umi, recipe.publicKey), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: [] as Array<IngredientInput>,
    outputs: <Array<IngredientOutput>>[
      {
        mint: mint.publicKey,
        amount: 1n,
        maxSupply: 100n,
      },
    ],
  });
});

test('it cannot add an ingredient as the wrong authority', async (t) => {
  // Given an empty recipe owned by authority A.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const authorityA = generateSigner(umi);
  await createRecipe(umi, {
    recipe,
    authority: authorityA.publicKey,
  }).sendAndConfirm(umi);

  // And a mint account.
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // When authority B tries to add that mint to the recipe.
  const authorityB = generateSigner(umi);
  const promise = addIngredient(umi, {
    authority: authorityB,
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});

test('it cannot add an ingredient input that is already an input', async (t) => {
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

  // When we try to add that ingredient input again.
  const promise = addIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Input,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'IngredientAlreadyAdded' });
});

test('it cannot add an ingredient output that is already an output', async (t) => {
  // Given a recipe with an ingredient output.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe })
    .add(createMint(umi, { mint }))
    .add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // When we try to add that ingredient output again.
  const promise = addIngredient(umi, {
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'IngredientAlreadyAdded' });
});

test('it cannot add an ingredient output if the authority is not its mint authority', async (t) => {
  // Given a recipe owned by authority A.
  const umi = await createUmi();
  const recipe = generateSigner(umi);
  const authorityA = generateSigner(umi);
  await createRecipe(umi, {
    recipe,
    authority: authorityA.publicKey,
  }).sendAndConfirm(umi);

  // And a mint account with mint authority B.
  const mint = generateSigner(umi);
  const authorityB = generateSigner(umi);
  await createMint(umi, {
    mint,
    mintAuthority: authorityB.publicKey,
  }).sendAndConfirm(umi);

  // When authority A tries to add that ingredient as an output.
  const promise = addIngredient(umi, {
    authority: authorityA,
    recipe: recipe.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidMintAuthority' });
});

test('it cannot add an ingredient output already delegated if the authority does not match', async (t) => {
  // Given a recipe A owned by authority A with a delegated ingredient output.
  const umi = await createUmi();
  const recipeA = generateSigner(umi);
  const authorityA = generateSigner(umi);
  const mint = generateSigner(umi);
  await createRecipe(umi, { recipe: recipeA, authority: authorityA.publicKey })
    .add(createMint(umi, { mint, mintAuthority: authorityA.publicKey }))
    .add(
      addIngredient(umi, {
        authority: authorityA,
        recipe: recipeA.publicKey,
        mint: mint.publicKey,
        ingredientType: IngredientType.Output,
      })
    )
    .sendAndConfirm(umi);

  // And an empty recipe B owned by authority B.
  const recipeB = generateSigner(umi);
  const authorityB = generateSigner(umi);
  await createRecipe(umi, {
    recipe: recipeB,
    authority: authorityB.publicKey,
  }).sendAndConfirm(umi);

  // When authority B tries to add that ingredient as an output to its own recipe.
  const promise = addIngredient(umi, {
    authority: authorityB,
    recipe: recipeB.publicKey,
    mint: mint.publicKey,
    ingredientType: IngredientType.Output,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'AccountMismatch' });
});
