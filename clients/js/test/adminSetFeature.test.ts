import { Token, fetchToken } from '@metaplex-foundation/mpl-toolbox';
import test from 'ava';
import { createUmi, mintFeature } from './_setup';

test.skip('the program ID owner can set feature account', async (t) => {
  // const umi = await createUmi();
  // t.is(context.feesFeature.key, Key.FeesFeature);
  // t.is(context.additionalOutputsFeature.key, Key.AdditionalOutputsFeature);
  // t.is(context.transferInputsFeature.key, Key.TransferInputsFeature);
  // t.is(context.maxSupplyFeature.key, Key.MaxSupplyFeature);
  // t.is(context.solPaymentFeature.key, Key.SolPaymentFeature);
  // t.is(context.wisdomFeature.key, Key.WisdomFeature);
});

test('it can mint token from feature mints', async (t) => {
  // Given existing features.
  const umi = await createUmi();

  // When we mint tokens from a feature mint.
  const { mint, ata } = await mintFeature(umi, 'FEES-mintBurn1', 42);

  // Then we expect the tokens to be minted.
  t.like(await fetchToken(umi, ata), <Token>{
    mint,
    owner: umi.identity.publicKey,
    amount: 42n,
  });
});
