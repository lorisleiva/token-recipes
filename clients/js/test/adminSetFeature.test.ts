import { Token, fetchToken } from '@metaplex-foundation/mpl-toolbox';
import test from 'ava';
import { createUmi, mintFeature } from './_setup';
import {
  Key,
  fetchAdditionalOutputsFeatureFromSeeds,
  fetchFeesFeatureFromSeeds,
  fetchMaxSupplyFeatureFromSeeds,
  fetchSolPaymentFeatureFromSeeds,
  fetchTransferInputsFeatureFromSeeds,
  fetchWisdomFeatureFromSeeds,
} from '../src';

test('the program ID owner can set feature account', async (t) => {
  const umi = await createUmi();
  const feesFeature = await fetchFeesFeatureFromSeeds(umi);
  t.is(feesFeature.key, Key.FeesFeature);
  const addOutputsFeature = await fetchAdditionalOutputsFeatureFromSeeds(umi);
  t.is(addOutputsFeature.key, Key.AdditionalOutputsFeature);
  const transferInputsFeature = await fetchTransferInputsFeatureFromSeeds(umi);
  t.is(transferInputsFeature.key, Key.TransferInputsFeature);
  const maxSupplyFeature = await fetchMaxSupplyFeatureFromSeeds(umi);
  t.is(maxSupplyFeature.key, Key.MaxSupplyFeature);
  const solPaymentFeature = await fetchSolPaymentFeatureFromSeeds(umi);
  t.is(solPaymentFeature.key, Key.SolPaymentFeature);
  const wisdomFeature = await fetchWisdomFeatureFromSeeds(umi);
  t.is(wisdomFeature.key, Key.WisdomFeature);
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
