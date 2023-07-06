import {
  SolAmount,
  displayAmount,
  divideAmount,
  generateSigner,
  multiplyAmount,
} from '@metaplex-foundation/umi';
import test from 'ava';
import {
  BASE_FEES,
  Recipe,
  craft,
  fetchRecipe,
  ingredientInput,
  ingredientOutput,
  setFees,
} from '../../src';
import { getUnlockFeatureMacro } from '../_macros';
import { createInputOutputMints, createRecipe, createUmi } from '../_setup';

const unlockMacro = getUnlockFeatureMacro('wisdom');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 3, 'mintBurn1', 0, 4);
test(unlockMacro, 1, 4, 'mintBurn1', 1, 4, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 5, 'mintBurn2', 0, 6);
test(unlockMacro, 1, 6, 'mintBurn2', 1, 6, 'max-level-reached');

const gainExperienceMacro = test.macro({
  title: (
    providedTitle,
    init: number | [number, number] | [number, number, SolAmount],
    expectedExperience: number | bigint
  ) => {
    if (providedTitle) return providedTitle;
    const wisdomLevel = Array.isArray(init) ? init[0] : init;
    const feeLevel = Array.isArray(init) ? init[1] : undefined;
    const customFee =
      Array.isArray(init) && init.length === 3 ? init[2] : undefined;
    const custom = customFee
      ? ` with custom fees ${displayAmount(customFee)}`
      : '';
    const fee = feeLevel ? ` and fees level ${feeLevel}${custom}` : '';
    return `it gains ${expectedExperience} experience when crafting a recipe with wisdom level ${wisdomLevel}${fee}`;
  },
  exec: async (
    t,
    init: number | [number, number] | [number, number, SolAmount],
    expectedExperience: number | bigint
  ) => {
    // Given an active recipe with predefined wisdom and fees levels.
    const wisdomLevel = Array.isArray(init) ? init[0] : init;
    const feeLevel = Array.isArray(init) ? init[1] : undefined;
    const umi = await createUmi();
    const crafter = generateSigner(umi);
    const [inputMint, outputMint] = await createInputOutputMints(umi, crafter);
    const recipe = await createRecipe(umi, {
      active: true,
      features: { wisdom: wisdomLevel, fees: feeLevel ?? 0 },
      inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 2 })],
      outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
    });

    // And potentially custom fees.
    const customFee =
      Array.isArray(init) && init.length === 3 ? init[2] : undefined;
    if (customFee) {
      await setFees(umi, {
        recipe,
        fees: customFee.basisPoints,
      }).sendAndConfirm(umi);
    }

    // And given that recipe has no accumulated experience.
    t.like(await fetchRecipe(umi, recipe), <Recipe>{
      accumulatedExperience: 0n,
    });

    // When the crafter crafts the recipe.
    await craft(umi, {
      recipe,
      owner: crafter,
      inputs: [{ __kind: 'BurnToken', mint: inputMint }],
      outputs: [{ __kind: 'MintToken', mint: outputMint }],
      quantity: 42,
    }).sendAndConfirm(umi);

    // Then the recipe kept track of the accumulated experience, regardless of the quantity.
    t.like(await fetchRecipe(umi, recipe), <Recipe>{
      accumulatedExperience: BigInt(expectedExperience),
    });
  },
});

const highFees = multiplyAmount(BASE_FEES, 2);
const lowFees = divideAmount(BASE_FEES, 2);

// wisdomLevel | [wisdomLevel, feesLevel, customFees], expectedExperience
test(gainExperienceMacro, 0, 100);
test(gainExperienceMacro, 1, 125);
test(gainExperienceMacro, 2, 150);
test(gainExperienceMacro, 3, 175);
test(gainExperienceMacro, 4, 200);
test(gainExperienceMacro, 5, 250);
test(gainExperienceMacro, 6, 300);
test(gainExperienceMacro, [4, 10], 200);
test(gainExperienceMacro, [4, 10, BASE_FEES], 200);
test(gainExperienceMacro, [4, 10, highFees], 200);
test(gainExperienceMacro, [4, 10, lowFees], 0);
test(gainExperienceMacro, [4, 11], 0);
test(gainExperienceMacro, [4, 11, BASE_FEES], 0);
test(gainExperienceMacro, [4, 11, highFees], 0);
test(gainExperienceMacro, [4, 11, lowFees], 0);

test('crafting multiple times does not override accumulated experience', async (t) => {
  // Given an active recipe with the wisdom feature at level 1.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [inputMint, outputMint] = await createInputOutputMints(umi, crafter);
  const recipe = await createRecipe(umi, {
    active: true,
    features: { wisdom: 1 },
    inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
  });

  // When the crafter sends the craft instruction twice.
  await craft(umi, {
    recipe,
    owner: crafter,
    inputs: [{ __kind: 'BurnToken', mint: inputMint }],
    outputs: [{ __kind: 'MintToken', mint: outputMint }],
    quantity: 2,
  })
    .add(
      craft(umi, {
        recipe,
        owner: crafter,
        inputs: [{ __kind: 'BurnToken', mint: inputMint }],
        outputs: [{ __kind: 'MintToken', mint: outputMint }],
        quantity: 2,
      })
    )
    .sendAndConfirm(umi);

  // Then the recipe kept track of the accumulated experience
  // and did not override them.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    accumulatedExperience: 125n * 2n,
  });
});
