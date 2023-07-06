import {
  SolAmount,
  displayAmount,
  divideAmount,
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
  title: (providedTitle, init: number | [number, SolAmount]) => {
    if (providedTitle) return providedTitle;
    const level = Array.isArray(init) ? init[0] : init;
    const custom = Array.isArray(init)
      ? ` with custom fees ${displayAmount(init[1])}`
      : '';
    return `it takes fees when crafting a level ${level} recipe${custom}`;
  },
  exec: async (
    t,
    init: number | [number, SolAmount],
    expectedFees: SolAmount,
    expectedAdminFees: SolAmount,
    expectedShards: SolAmount
  ) => {
    // Given an active recipe with the fees feature at level X.
    const level = Array.isArray(init) ? init[0] : init;
    const umi = await createUmi();
    const crafter = generateSigner(umi);
    const [inputMint, outputMint] = await createInputOutputMints(umi, crafter);
    const recipe = await createRecipe(umi, {
      active: true,
      features: { fees: level },
      inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 2 })],
      outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
    });

    if (Array.isArray(init)) {
      await setFees(umi, {
        recipe,
        fees: init[1].basisPoints,
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

const highFees = multiplyAmount(BASE_FEES, 2);
const lowFees = divideAmount(BASE_FEES, 2);
const p = (amount: SolAmount, percentage: number) =>
  multiplyAmount(amount, percentage / 100);

// level | [level, customFees], expectedFees, expectedAdminFees, expectedShards
test(takeFeesMacro, 0, BASE_FEES, BASE_FEES, sol(0));
test(takeFeesMacro, 1, BASE_FEES, p(BASE_FEES, 90), p(BASE_FEES, 90));
test(takeFeesMacro, 2, BASE_FEES, p(BASE_FEES, 80), p(BASE_FEES, 80));
test(takeFeesMacro, 3, BASE_FEES, p(BASE_FEES, 70), p(BASE_FEES, 70));
test(takeFeesMacro, 4, BASE_FEES, p(BASE_FEES, 60), p(BASE_FEES, 60));
test(takeFeesMacro, 5, BASE_FEES, p(BASE_FEES, 50), p(BASE_FEES, 50));
test(takeFeesMacro, 6, BASE_FEES, p(BASE_FEES, 40), p(BASE_FEES, 40));
test(takeFeesMacro, 7, BASE_FEES, p(BASE_FEES, 30), p(BASE_FEES, 30));
test(takeFeesMacro, 8, BASE_FEES, p(BASE_FEES, 20), p(BASE_FEES, 20));
test(takeFeesMacro, 9, BASE_FEES, p(BASE_FEES, 10), p(BASE_FEES, 10));
test(takeFeesMacro, 10, BASE_FEES, p(BASE_FEES, 10), p(BASE_FEES, 10));
test(takeFeesMacro, [10, highFees], highFees, p(highFees, 10), p(highFees, 10));
test(takeFeesMacro, [10, lowFees], lowFees, p(lowFees, 10), sol(0));
test(takeFeesMacro, 11, BASE_FEES, sol(0), sol(0));
test(takeFeesMacro, [11, highFees], highFees, sol(0), sol(0));
test(takeFeesMacro, [11, lowFees], lowFees, sol(0), sol(0));

// TODO: crafting multiple times does not override accumulated fees
