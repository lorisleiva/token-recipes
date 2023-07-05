import {
  Mint,
  Token,
  createMint,
  fetchMint,
  fetchToken,
} from '@metaplex-foundation/mpl-toolbox';
import { generateSigner } from '@metaplex-foundation/umi';
import test from 'ava';
import {
  IngredientOutput,
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

const unlockMacro = getUnlockFeatureMacro('additionalOutputs');

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

test('it cannot add multiple outputs by default', async (t) => {
  // Given 2 mint accounts.
  const umi = await createUmi();
  const mintA = generateSigner(umi);
  const mintB = generateSigner(umi);
  await createMint(umi, { mint: mintA })
    .add(createMint(umi, { mint: mintB }))
    .sendAndConfirm(umi);

  // And a recipe that hasn't unlocked additional outputs and that has one output ingredient.
  const recipe = await createRecipe(umi, {
    outputs: [
      ingredientOutput('MintToken', { mint: mintA.publicKey, amount: 1 }),
    ],
  });

  // When we try to add an additional output ingredient.
  const promise = addIngredient(umi, {
    recipe,
    mint: mintB.publicKey,
    ingredientType: IngredientType.MintTokenOutput,
    amount: 2n,
  }).sendAndConfirm(umi);

  // Then we expect a program error.
  await t.throwsAsync(promise, { name: 'InvalidAdditionalOutputsFeature' });

  // And the recipe still has only 1 output ingredient.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    outputs: <Array<IngredientOutput>>[
      { __kind: 'MintToken', mint: mintA.publicKey, amount: 1n },
    ],
  });
});

test('it can add multiple outputs when unlocked', async (t) => {
  // Given 2 mint accounts.
  const umi = await createUmi();
  const mintA = generateSigner(umi);
  const mintB = generateSigner(umi);
  await createMint(umi, { mint: mintA })
    .add(createMint(umi, { mint: mintB }))
    .sendAndConfirm(umi);

  // And a recipe that unlocked additional outputs and that has one output ingredient.
  const recipe = await createRecipe(umi, {
    features: { additionalOutputs: 1 },
    outputs: [
      ingredientOutput('MintToken', { mint: mintA.publicKey, amount: 1 }),
    ],
  });

  // When we add an additional output ingredient.
  await addIngredient(umi, {
    recipe,
    mint: mintB.publicKey,
    ingredientType: IngredientType.MintTokenOutput,
    amount: 2n,
  }).sendAndConfirm(umi);

  // Then the recipe has 2 output ingredients.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    outputs: <Array<IngredientOutput>>[
      { __kind: 'MintToken', mint: mintA.publicKey, amount: 1n },
      { __kind: 'MintToken', mint: mintB.publicKey, amount: 2n },
    ],
  });
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

  // And a recipe that unlocked additional outputs
  // and uses 5 mint A and outputs 1 mint B and 2 mint C.
  const recipe = await createRecipe(umi, {
    active: true,
    features: { additionalOutputs: 1 },
    inputs: [ingredientInput('BurnToken', { mint: mintA, amount: 5 })],
    outputs: [
      ingredientOutput('MintToken', { mint: mintB, amount: 1 }),
      ingredientOutput('MintToken', { mint: mintC, amount: 2 }),
    ],
  });

  // When the crafter crafts the recipe.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: mintA }],
    outputs: [
      { __kind: 'MintToken', mint: mintB },
      { __kind: 'MintToken', mint: mintC },
    ],
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
