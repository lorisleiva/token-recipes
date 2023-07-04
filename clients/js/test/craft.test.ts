import {
  Mint,
  Token,
  createMint,
  createToken,
  fetchMint,
  fetchToken,
  findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import type { SendTransactionError } from '@solana/web3.js';
import test from 'ava';
import {
  Recipe,
  RecipeStatus,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../src';
import { createMintWithHolders, createRecipe, createUmi } from './_setup';

test('it can craft a recipe', async (t) => {
  // Given 3 mint accounts A, B and C, such that a crafter owns:
  // - 100 tokens of mint A
  // - 100 tokens of mint B
  // - 0 tokens of mint C
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA, tokenA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintB, tokenB] = await createMintWithHolders(umi, {
    decimals: 1,
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintC, tokenC] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 2 mint A and 7 mint B as inputs and outputs 1 mint C.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [
      ingredientInput('BurnToken', { mint: mintA, amount: 2 }),
      ingredientInput('BurnToken', { mint: mintB, amount: 7 }),
    ],
    outputs: [ingredientOutput('MintToken', { mint: mintC, amount: 1 })],
  });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
    inputs: [
      { __kind: 'BurnToken', mint: mintA, amount: 2n },
      { __kind: 'BurnToken', mint: mintB, amount: 7n },
    ],
    outputs: [{ __kind: 'MintToken', mint: mintC, amount: 1n }],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [
      { __kind: 'BurnToken', mint: mintA },
      { __kind: 'BurnToken', mint: mintB },
    ],
    outputs: [{ __kind: 'MintToken', mint: mintC }],
  }).sendAndConfirm(umi);

  // Then the crafter burned 2 mint A.
  t.like(await fetchToken(umi, tokenA), <Token>{ amount: 98n });
  t.like(await fetchMint(umi, mintA), <Mint>{ supply: 98n });

  // And the crafter burned 7 mint B.
  t.like(await fetchToken(umi, tokenB), <Token>{ amount: 93n });
  t.like(await fetchMint(umi, mintB), <Mint>{ supply: 93n });

  // And the crafter received 1 mint C.
  t.like(await fetchToken(umi, tokenC), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, mintC), <Mint>{ supply: 1n });
});

test('it can craft a recipe in multiple quantities', async (t) => {
  // Given 3 mint accounts A, B and C, such that a crafter owns:
  // - 100 tokens of mint A
  // - 100 tokens of mint B
  // - 0 tokens of mint C
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA, tokenA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintB, tokenB] = await createMintWithHolders(umi, {
    decimals: 1,
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintC, tokenC] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 2 mint A and 7 mint B as inputs and outputs 1 mint C.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [
      ingredientInput('BurnToken', { mint: mintA, amount: 2 }),
      ingredientInput('BurnToken', { mint: mintB, amount: 7 }),
    ],
    outputs: [ingredientOutput('MintToken', { mint: mintC, amount: 1 })],
  });

  // When the crafter crafts the recipe 14 times.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [
      { __kind: 'BurnToken', mint: mintA },
      { __kind: 'BurnToken', mint: mintB },
    ],
    outputs: [{ __kind: 'MintToken', mint: mintC }],
    quantity: 14,
  }).sendAndConfirm(umi);

  // Then the crafter burned 28 (2 * 14) mint A.
  t.like(await fetchToken(umi, tokenA), <Token>{ amount: 72n });
  t.like(await fetchMint(umi, mintA), <Mint>{ supply: 72n });

  // And the crafter burned 98 (7 * 14) mint B.
  t.like(await fetchToken(umi, tokenB), <Token>{ amount: 2n });
  t.like(await fetchMint(umi, mintB), <Mint>{ supply: 2n });

  // And the crafter received 14 mint C.
  t.like(await fetchToken(umi, tokenC), <Token>{ amount: 14n });
  t.like(await fetchMint(umi, mintC), <Mint>{ supply: 14n });
});

test('it creates a new associated token account if not yet initialized', async (t) => {
  // Given a mint account and a crafter that has no token account for that mint.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);
  const [ata] = findAssociatedTokenPda(umi, {
    mint: mint.publicKey,
    owner: crafter.publicKey,
  });
  t.false(await umi.rpc.accountExists(ata));

  // And a recipe that outputs 1 token of that mint.
  const recipe = await createRecipe(umi, {
    active: true,
    outputs: [
      ingredientOutput('MintToken', { mint: mint.publicKey, amount: 1 }),
    ],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    outputs: [{ __kind: 'MintToken', mint: mint.publicKey }],
  }).sendAndConfirm(umi);

  // Then the associated token account was created.
  t.true(await umi.rpc.accountExists(ata));

  // And the crafter received 1 token of that mint.
  t.like(await fetchToken(umi, ata), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{ supply: 1n });
});

test('it can use an existing non-associated token account', async (t) => {
  // Given a mint account and a crafter that has a non-associated token account for that mint.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const mint = generateSigner(umi);
  const token = generateSigner(umi);
  await createMint(umi, { mint })
    .add(
      createToken(umi, {
        token,
        mint: mint.publicKey,
        owner: crafter.publicKey,
      })
    )
    .sendAndConfirm(umi);

  // And a recipe that outputs 1 token of that mint.
  const recipe = await createRecipe(umi, {
    active: true,
    outputs: [
      ingredientOutput('MintToken', { mint: mint.publicKey, amount: 1 }),
    ],
  });

  // When the crafter crafts the recipe by using the existing token account.
  await craft(umi, {
    recipe,
    owner: crafter,
    outputs: [
      { __kind: 'MintToken', mint: mint.publicKey, token: token.publicKey },
    ],
  }).sendAndConfirm(umi);

  // Then the existing token account was used to receive the token.
  t.like(await fetchToken(umi, token.publicKey), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{ supply: 1n });
});

test('it cannot craft a recipe if the recipe is paused', async (t) => {
  // Given a paused recipe.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
  });

  // When a anyone tries to craft the recipe.
  const promise = craft(umi, {
    recipe,
    owner: generateSigner(umi),
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'RecipeIsNotActive' });
});

test('it cannot craft a recipe if an input has not enough tokens', async (t) => {
  // Given 2 mint accounts A and B, such that a crafter owns:
  // - 1 tokens of mint A
  // - 0 tokens of mint B
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 1 }],
  });
  const [mintB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 2 mint A and outputs 1 mint B.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: mintB, amount: 1 })],
  });

  // When the crafter tries to crafts the recipe.
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: mintA }],
    outputs: [{ __kind: 'MintToken', mint: mintB }],
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'NotEnoughTokens' });
});

test('it cannot craft a recipe if an input has not enough tokens for multiple quantities', async (t) => {
  // Given 2 mint accounts A and B, such that a crafter owns:
  // - 7 tokens of mint A
  // - 0 tokens of mint B
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 7 }],
  });
  const [mintB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 2 mint A and outputs 1 mint B.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: mintB, amount: 1 })],
  });

  // When the crafter tries to crafts the recipe 4 times.
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: mintA }],
    outputs: [{ __kind: 'MintToken', mint: mintB }],
    quantity: 4,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'NotEnoughTokens' });
});

test('it cannot craft a recipe if an output has reached its maximum supply', async (t) => {
  // Given 2 mint accounts A and B, such that a crafter owns:
  // - 4 tokens of mint A
  // - 90 tokens of mint B
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 4 }],
  });
  const [mintB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 90 }],
  });

  // And a recipe that uses 2 mint A and outputs 6 mint B with a maximum supply of 100.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 2 })],
    outputs: [
      ingredientOutput('MintTokenWithMaxSupply', {
        mint: mintB,
        amount: 6,
        maxSupply: 100,
      }),
    ],
  });

  // When the crafter tries to crafts the recipe twice
  // which would result in mint B reaching its maximum supply (102).
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: mintA }],
    outputs: [{ __kind: 'MintTokenWithMaxSupply', mint: mintB }],
    quantity: 2,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'MaximumSupplyReached' });
});

test('it cannot craft a recipe if remaining accounts are missing', async (t) => {
  // Given 2 mint accounts A and B, such that a crafter owns:
  // - 2 tokens of mint A
  // - 0 tokens of mint B
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 2 }],
  });
  const [mintB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 2 mint A and outputs 1 mint B.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: mintB, amount: 1 })],
  });

  // When the crafter tries to crafts the recipe without passing any remaining accounts.
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    // inputs missing.
    // outputs missing.
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  const error = await t.throwsAsync<SendTransactionError>(promise);
  t.true((error?.logs ?? []).join('\n').includes('NotEnoughAccountKeys'));
});

test('it cannot create an uninitialized token account if it is not associated', async (t) => {
  // Given a mint account and a crafter that has no token account for that mint.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // And a recipe that outputs 1 token of that mint.
  const recipe = await createRecipe(umi, {
    active: true,
    outputs: [
      ingredientOutput('MintToken', { mint: mint.publicKey, amount: 1 }),
    ],
  });

  // When the crafter crafts the recipe by providing the address
  // of a non-associated token account that does not exist.
  const token = generateSigner(umi).publicKey;
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    outputs: [{ __kind: 'MintToken', mint: mint.publicKey, token }],
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidPda' });
});

test('it keep tracks of the total amount of crafts and experience accumulated', async (t) => {
  // Given an active recipe with no experience and no crafts.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: mintB, amount: 1 })],
  });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
    totalCrafts: 0n,
    totalCraftsWithQuantity: 0n,
    accumulatedExperience: 0n,
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: mintA }],
    outputs: [{ __kind: 'MintToken', mint: mintB }],
    quantity: 42,
  }).sendAndConfirm(umi);

  // Then we expect the recipe to have kept craft statistics and added experience.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
    totalCrafts: 1n,
    totalCraftsWithQuantity: 42n,
    accumulatedExperience: 100n,
  });
});
