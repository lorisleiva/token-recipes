import test from 'ava';
import { withFeatures } from './_features';
import { createUmi } from './_setup';

test('the program ID owner can set feature account', async (t) => {
  const umi = await createUmi();
  await withFeatures(umi);
});
