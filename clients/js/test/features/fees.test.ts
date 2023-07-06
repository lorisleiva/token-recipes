import {
  SolAmount,
  generateSigner,
  isEqualToAmount,
  multiplyAmount,
  sol,
  subtractAmounts,
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
import {
  TX_FEE_TOLERANCE,
  createInputOutputMints,
  createRecipe,
  createUmi,
} from '../_setup';

const unlockMacro = getUnlockFeatureMacro('fees');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 1, 'mintBurn1', 1, 1, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 9, 'mintBurn2', 0, 10);
test(unlockMacro, 1, 10, 'mintBurn2', 1, 10, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn3', 0, 1);
test(unlockMacro, 1, 10, 'mintBurn3', 0, 11);
test(unlockMacro, 1, 11, 'mintBurn3', 1, 11, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintBurn4', 0, 10);
test(unlockMacro, 1, 5, 'mintBurn4', 0, 10);
test(unlockMacro, 1, 10, 'mintBurn4', 1, 10, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn5', 0, 11);
test(unlockMacro, 1, 5, 'mintBurn5', 0, 11);
test(unlockMacro, 1, 11, 'mintBurn5', 1, 11, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 1, 'mintSkill1', 1, 1, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill2', 1, 10);
test(unlockMacro, 1, 5, 'mintSkill2', 1, 10);
test(unlockMacro, 1, 10, 'mintSkill2', 1, 10, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill3', 1, 11);
test(unlockMacro, 1, 5, 'mintSkill3', 1, 11);
test(unlockMacro, 1, 11, 'mintSkill3', 1, 11, 'max-level-reached');

const takeFeesMacro = test.macro({
  title: (providedTitle, level: number | [number, SolAmount]) => {
    if (providedTitle) return providedTitle;
    level = Array.isArray(level) ? level[0] : level;
    const custom = Array.isArray(level) ? ` with custom fees` : '';
    return `it takes fees when crafting a level ${level} recipe${custom}`;
  },
  exec: async (
    t,
    level: number | [number, SolAmount],
    expectedFees: SolAmount,
    expectedAdminFees: SolAmount,
    expectedShards: SolAmount
  ) => {
    // Given an active recipe with the fees feature at level X.
    level = Array.isArray(level) ? level[0] : level;
    const umi = await createUmi();
    const crafter = generateSigner(umi);
    const [inputMint, outputMint] = await createInputOutputMints(umi, crafter);
    const recipe = await createRecipe(umi, {
      active: true,
      features: { fees: level },
      inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 2 })],
      outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
    });

    if (Array.isArray(level)) {
      await setFees(umi, {
        recipe,
        fees: level[1].basisPoints,
      }).sendAndConfirm(umi);
    }

    // And given we keep track of the payer's balance before crafting.
    const payerBalance = await umi.rpc.getBalance(umi.payer.publicKey);

    // When the crafter crafts the recipe.
    await craft(umi, {
      recipe,
      owner: crafter,
      inputs: [{ __kind: 'BurnToken', mint: inputMint }],
      outputs: [{ __kind: 'MintToken', mint: outputMint }],
      quantity: 42,
    }).sendAndConfirm(umi);

    // Then the payer paid for the fees once, regardless of the quantity.
    const newPayerBalance = await umi.rpc.getBalance(umi.payer.publicKey);
    t.true(
      isEqualToAmount(
        newPayerBalance,
        subtractAmounts(payerBalance, expectedFees),
        TX_FEE_TOLERANCE
      )
    );

    // And the recipe kept track of the accumulated admin fees and shards.
    t.like(await fetchRecipe(umi, recipe), <Recipe>{
      accumulatedAdminFees: expectedAdminFees.basisPoints,
      accumulatedShards: expectedShards.basisPoints,
    });
  },
});

const p = (amount: SolAmount, percentage: number) =>
  multiplyAmount(amount, percentage / 100);

// level | [level, customFees], expectedFees, expectedAdminFees, expectedShards
test(takeFeesMacro, 0, BASE_FEES, BASE_FEES, sol(0));
test(takeFeesMacro, 1, BASE_FEES, p(BASE_FEES, 90), p(BASE_FEES, 10));

// TODO: crafting multiple times does not override accumulated fees
