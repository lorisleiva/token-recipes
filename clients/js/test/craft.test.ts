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

test('it can craft a recipe with multiple outputs', async (t) => {
  // Given 3 mint accounts A, B and C, such that a crafter owns:
  // - 100 tokens of mint A
  // - 42 tokens of mint B
  // - 0 tokens of mint C
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [mintA, tokenA] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintB, tokenB] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 42 }],
  });
  const [mintC, tokenC] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 5 mint A and outputs 1 mint B and 2 mint C.
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [{ mint: mintA, amount: 5 }],
    outputs: [
      { mint: mintB, amount: 1 },
      { mint: mintC, amount: 2 },
    ],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ mint: mintA }],
    outputs: [{ mint: mintB }, { mint: mintC }],
  }).sendAndConfirm(umi);

  // Then the crafter burned 5 mint A.
  t.like(await fetchToken(umi, tokenA), <Token>{ amount: 95n });
  t.like(await fetchMint(umi, mintA), <Mint>{ supply: 95n });

  // And the crafter received 1 mint B.
  t.like(await fetchToken(umi, tokenB), <Token>{ amount: 43n });
  t.like(await fetchMint(umi, mintB), <Mint>{ supply: 43n });

  // And the crafter received 2 mint C.
  t.like(await fetchToken(umi, tokenC), <Token>{ amount: 2n });
  t.like(await fetchMint(umi, mintC), <Mint>{ supply: 2n });
});

test.skip('it can craft a recipe with an input ingredient that transfers tokens', async (t) => {
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
    holders: [{ owner: crafter.publicKey, amount: 100 }],
  });
  const [mintC, tokenC] = await createMintWithHolders(umi, {
    holders: [{ owner: crafter.publicKey, amount: 0 }],
  });

  // And a recipe that uses 2 mint A and 7 mint B as inputs and outputs 1 mint C.
  // Instead of burning the mint A tokens, it sends them to a specified destination.
  const destination = generateSigner(umi).publicKey;
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [
      { mint: mintA, amount: 2, destination },
      { mint: mintB, amount: 7 },
    ],
    outputs: [{ mint: mintC, amount: 1 }],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ mint: mintA }, { mint: mintB }],
    outputs: [{ mint: mintC }],
  }).sendAndConfirm(umi);

  // Then the crafter sent 2 mint A to the destination.
  const [destinationAta] = findAssociatedTokenPda(umi, {
    mint: mintA,
    owner: destination,
  });
  t.like(await fetchToken(umi, destinationAta), <Token>{ amount: 2n });
  t.like(await fetchToken(umi, tokenA), <Token>{ amount: 98n });
  t.like(await fetchMint(umi, mintA), <Mint>{ supply: 100n });

  // And the crafter burned 7 mint B.
  t.like(await fetchToken(umi, tokenB), <Token>{ amount: 93n });
  t.like(await fetchMint(umi, mintB), <Mint>{ supply: 93n });

  // And the crafter received 1 mint C.
  t.like(await fetchToken(umi, tokenC), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, mintC), <Mint>{ supply: 1n });
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
    outputs: [{ mint: mint.publicKey, amount: 1 }],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    outputs: [{ mint: mint.publicKey }],
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
    outputs: [{ mint: mint.publicKey, amount: 1 }],
  });

  // When the crafter crafts the recipe by using the existing token account.
  await craft(umi, {
    recipe,
    owner: crafter,
    outputs: [{ mint: mint.publicKey, token: token.publicKey }],
  }).sendAndConfirm(umi);

  // Then the existing token account was used to receive the token.
  t.like(await fetchToken(umi, token.publicKey), <Token>{ amount: 1n });
  t.like(await fetchMint(umi, mint.publicKey), <Mint>{ supply: 1n });
});

test.todo('it cannot craft a recipe if the recipe is paused');
test.todo('it cannot craft a recipe if an input has not enough tokens');
test.todo(
  'it cannot craft a recipe if an input has not enough tokens for multiple quantities'
);
test.todo(
  'it cannot craft a recipe if an output has reached its maximum supply'
);
test.todo('it cannot craft a recipe if remaining accounts are missing');

test('it cannot create an uninitialized token account if it is not associated', async (t) => {
  // Given a mint account and a crafter that has no token account for that mint.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // And a recipe that outputs 1 token of that mint.
  const recipe = await createRecipe(umi, {
    active: true,
    outputs: [{ mint: mint.publicKey, amount: 1 }],
  });

  // When the crafter crafts the recipe by providing the address
  // of a non-associated token account that does not exist.
  const token = generateSigner(umi).publicKey;
  const promise = craft(umi, {
    recipe,
    owner: crafter,
    outputs: [{ mint: mint.publicKey, token }],
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidPda' });
});
