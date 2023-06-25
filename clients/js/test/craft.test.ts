import {
  Mint,
  Token,
  fetchMint,
  fetchToken,
} from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import { MAX_U64, Recipe, RecipeStatus, craft, fetchRecipe } from '../src';
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
      { mint: mintA, amount: 2 },
      { mint: mintB, amount: 7 },
    ],
    outputs: [{ mint: mintC, amount: 1 }],
  });
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Active,
    inputs: [
      { mint: mintA, amount: 2n },
      { mint: mintB, amount: 7n },
    ],
    outputs: [{ mint: mintC, amount: 1n, maxSupply: MAX_U64 }],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ mint: mintA }, { mint: mintB }],
    outputs: [{ mint: mintC }],
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
      { mint: mintA, amount: 2 },
      { mint: mintB, amount: 7 },
    ],
    outputs: [{ mint: mintC, amount: 1 }],
  });

  // When the crafter crafts the recipe 14 times.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ mint: mintA }, { mint: mintB }],
    outputs: [{ mint: mintC }],
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

// it can craft a recipe with multiple outputs
// it can craft a recipe with an input ingredient that transfers tokens
// it creates a new associated token account if not yet initialized
// it can use an existing non-associated token account

// it cannot craft a recipe if the recipe is paused
// it cannot craft a recipe if an input has not enough tokens
// it cannot craft a recipe if an input has not enough tokens for multiple quantities
// it cannot craft a recipe if an output has reached its maximum supply
// it cannot craft a recipe if remaining accounts are missing
// it cannot create an uninitialized token account if it is not associated
