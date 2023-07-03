import test from 'ava';
import { withFeatures } from './_features';
import { createUmi } from './_setup';
import { Key } from '../src';

test('the program ID owner can set feature account', async (t) => {
  const umi = await createUmi();
  const context = await withFeatures(umi);
  t.is(context.feesFeature.key, Key.FeesFeature);
  t.is(context.additionalOutputsFeature.key, Key.AdditionalOutputsFeature);
  t.is(context.transferInputsFeature.key, Key.TransferInputsFeature);
  t.is(context.maxSupplyFeature.key, Key.MaxSupplyFeature);
  t.is(context.solPaymentFeature.key, Key.SolPaymentFeature);
  t.is(context.wisdomFeature.key, Key.WisdomFeature);
});
