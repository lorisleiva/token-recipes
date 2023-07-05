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
  IngredientType,
  Recipe,
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

test('it cannot add transfer token inputs by default', async (t) => {
  // Given a mint account.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);

  // And a recipe that hasn't unlocked transfer inputs.
  const recipe = await createRecipe(umi);

  // When we try to add a transfer input ingredient.
  const destination = generateSigner(umi).publicKey;
  const promise = addIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    destination,
    ingredientType: IngredientType.TransferTokenInput,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidTransferInputsFeature' });

  // And the recipe still has no input ingredients.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    inputs: <Array<IngredientInput>>[],
  });
});

test('it can add a transfer token ingredient input when unlocked', async (t) => {
  // Given a recipe that unlocked transfer inputs and a mint account.
  const umi = await createUmi();
  const mint = generateSigner(umi);
  await createMint(umi, { mint }).sendAndConfirm(umi);
  const recipe = await createRecipe(umi, {
    features: { transferInputs: 1 },
  });

  // When we add that mint as a transfer token input ingredient.
  const destination = generateSigner(umi).publicKey;
  await addIngredient(umi, {
    recipe,
    mint: mint.publicKey,
    ingredientType: IngredientType.TransferTokenInput,
    destination,
  }).sendAndConfirm(umi);

  // Then the recipe now has that ingredient.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    inputs: <Array<IngredientInput>>[
      {
        __kind: 'TransferToken',
        mint: mint.publicKey,
        amount: 1n,
        destination,
      },
    ],
  });
});

test('it can craft a recipe with a transfer token input', async (t) => {
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
  // And given that the recipe unlocked transfer inputs.
  const destination = generateSigner(umi).publicKey;
  const recipe = await createRecipe(umi, {
    active: true,
    features: { transferInputs: 1 },
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
