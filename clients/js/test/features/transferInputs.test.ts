import {
  Mint,
  Token,
  createMint,
  fetchMint,
  fetchToken,
  findAssociatedTokenPda,
} from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  IngredientInput,
  IngredientOutput,
  IngredientType,
  Recipe,
  RecipeStatus,
  addIngredient,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
} from '../../src';
import { getUnlockFeatureMacro } from '../_macros';
import { createMintWithHolders, createRecipe, createUmi } from '../_setup';

const unlockMacro = getUnlockFeatureMacro('transferInputs');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 2, 'mintBurn1', 1, 2, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 2, 'mintBurn2', 0, 3);
test(unlockMacro, 1, 3, 'mintBurn2', 1, 3, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 1, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 3, 'mintBurn3', 1, 3, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintSkill1', 1, 2);
test(unlockMacro, 1, 2, 'mintSkill1', 1, 2, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill2', 1, 3);
test(unlockMacro, 1, 3, 'mintSkill2', 1, 3, 'max-level-reached');

// it cannot add a transfer token ingredient input by default

test.skip('it can add a transfer token ingredient input when unlocked', async (t) => {
  // Given an empty recipe and a mint account.
  const umi = await createUmi();
  const recipe = await createRecipe(umi);
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // When we add that mint as an ingredient input with a destination.
  const destination = generateSigner(umi).publicKey;
  await addIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.TransferTokenInput,
    destination,
  }).sendAndConfirm(umi);

  // Then the recipe account stores the destination for that ingredient.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    status: RecipeStatus.Paused,
    inputs: <Array<IngredientInput>>[
      {
        __kind: 'TransferToken',
        mint: mint.publicKey,
        amount: 1n,
        destination,
      },
    ],
    outputs: [] as Array<IngredientOutput>,
  });
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
      ingredientInput('TransferToken', { mint: mintA, amount: 2, destination }),
      ingredientInput('BurnToken', { mint: mintB, amount: 7 }),
    ],
    outputs: [ingredientOutput('MintToken', { mint: mintC, amount: 1 })],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [
      { __kind: 'TransferToken', mint: mintA, destination },
      { __kind: 'BurnToken', mint: mintB },
    ],
    outputs: [{ __kind: 'MintToken', mint: mintC }],
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
