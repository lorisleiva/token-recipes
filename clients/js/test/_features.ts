/* eslint-disable import/no-extraneous-dependencies */
import {
  Umi,
  createSignerFromKeypair,
  displayAmount,
  generateSigner,
} from '@metaplex-foundation/umi';
import { readFileSync } from 'fs';
import path from 'path';
import {
  FeesFeatureAccountData,
  Key,
  adminSetFeature,
  feature,
  findFeesFeaturePda,
} from '../src';

const rootDir = path.join(__dirname, '..', '..', '..', '..');
const programScripts = path.join(rootDir, 'configs', 'program-scripts');
const localnet = path.join(programScripts, 'localnet.json');
let featuresCreated = false;

export const localnetSigner = (umi: Umi) => {
  const secretKey = new Uint8Array(JSON.parse(readFileSync(localnet, 'utf8')));
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  return createSignerFromKeypair(umi, keypair);
};

export const withFeatures = async (umi: Umi) => {
  if (featuresCreated) return;
  const programId = localnetSigner(umi);
  const { payer } = umi;
  console.log({
    programBalance: displayAmount(
      await umi.rpc.getBalance(programId.publicKey)
    ),
    payerBalance: displayAmount(await umi.rpc.getBalance(payer.publicKey)),
  });

  // Fees.
  const feesFeature: FeesFeatureAccountData = {
    key: Key.FeesFeature,
    adminDestination: generateSigner(umi).publicKey,
    shardMint: generateSigner(umi).publicKey, // TODO: generate real mint.
    mintBurn1: generateSigner(umi).publicKey,
    mintBurn2: generateSigner(umi).publicKey,
    mintBurn3: generateSigner(umi).publicKey,
    mintBurn4: generateSigner(umi).publicKey,
    mintSkill1: generateSigner(umi).publicKey,
    mintSkill2: generateSigner(umi).publicKey,
    mintSkill3: generateSigner(umi).publicKey,
  };

  await adminSetFeature(umi, {
    programId,
    featurePda: findFeesFeaturePda(umi),
    payer,
    feature: feature('Fees', [feesFeature]),
  }).sendAndConfirm(umi);

  console.log({
    programBalance: displayAmount(
      await umi.rpc.getBalance(programId.publicKey)
    ),
    payerBalance: displayAmount(await umi.rpc.getBalance(payer.publicKey)),
  });
  featuresCreated = true;
};
