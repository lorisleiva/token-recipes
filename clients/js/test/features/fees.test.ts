import {
  generateSigner,
  isEqualToAmount,
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

test('it takes fees when crafting a level 0 recipe', async (t) => {
  // Given an active recipe with the fees feature at level 0.
  const umi = await createUmi();
  const crafter = generateSigner(umi);
  const [inputMint, outputMint] = await createInputOutputMints(umi, crafter);
  const recipe = await createRecipe(umi, {
    active: true,
    inputs: [ingredientInput('BurnToken', { mint: inputMint, amount: 2 })],
    outputs: [ingredientOutput('MintToken', { mint: outputMint, amount: 1 })],
  });

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

  // Then the payer paid for the base fees once, regardless of the quantity.
  const newPayerBalance = await umi.rpc.getBalance(umi.payer.publicKey);
  t.true(
    isEqualToAmount(
      newPayerBalance,
      subtractAmounts(payerBalance, BASE_FEES),
      TX_FEE_TOLERANCE
    )
  );

  // And the recipe kept track of the accumulated admin fees and shards.
  t.like(await fetchRecipe(umi, recipe), <Recipe>{
    accumulatedAdminFees: BASE_FEES.basisPoints,
    accumulatedShards: 0n,
  });
});
