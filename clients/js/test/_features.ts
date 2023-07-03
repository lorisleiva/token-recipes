/* eslint-disable import/no-extraneous-dependencies */
import { createMint } from '@metaplex-foundation/mpl-toolbox';
import {
  PublicKey,
  Signer,
  Umi,
  createSignerFromKeypair,
  displayAmount,
  transactionBuilder,
  transactionBuilderGroup,
} from '@metaplex-foundation/umi';
import { string } from '@metaplex-foundation/umi/serializers';
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

export const localnetSigner = (umi: Umi) => {
  const secretKey = new Uint8Array(JSON.parse(readFileSync(localnet, 'utf8')));
  const keypair = umi.eddsa.createKeypairFromSecretKey(secretKey);
  return createSignerFromKeypair(umi, keypair);
};

export const seededSigner = (umi: Umi, seed: string) => {
  const keypair = umi.eddsa.createKeypairFromSeed(
    string({ size: 32 }).serialize(`token-recipes-${seed}`)
  );
  return createSignerFromKeypair(umi, keypair);
};

export type FeatureContext = {
  feesFeaturePda: PublicKey;
  feesFeature: FeesFeatureAccountData;
};

let featureContext: FeatureContext | undefined;

export const withFeatures = async (umi: Umi): Promise<FeatureContext> => {
  if (featureContext) return featureContext;
  const programId = localnetSigner(umi);
  const { payer } = umi;
  const mints = [] as Signer[];
  console.log({
    programBalance: displayAmount(
      await umi.rpc.getBalance(programId.publicKey)
    ),
    payerBalance: displayAmount(await umi.rpc.getBalance(payer.publicKey)),
  });

  // Fees.
  const [feesFeaturePda] = findFeesFeaturePda(umi);
  const feesFeature: FeesFeatureAccountData = {
    key: Key.FeesFeature,
    adminDestination: seededSigner(umi, 'fees-adminDestination').publicKey,
    shardMint: seededSigner(umi, 'fees-shardMint').publicKey,
    mintBurn1: seededSigner(umi, 'fees-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'fees-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'fees-mintBurn3').publicKey,
    mintBurn4: seededSigner(umi, 'fees-mintBurn4').publicKey,
    mintSkill1: seededSigner(umi, 'fees-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'fees-mintSkill2').publicKey,
    mintSkill3: seededSigner(umi, 'fees-mintSkill3').publicKey,
  };
  mints.push(
    ...[
      seededSigner(umi, 'fees-shardMint'),
      seededSigner(umi, 'fees-mintBurn1'),
      seededSigner(umi, 'fees-mintBurn2'),
      seededSigner(umi, 'fees-mintBurn3'),
      seededSigner(umi, 'fees-mintBurn4'),
      seededSigner(umi, 'fees-mintSkill1'),
      seededSigner(umi, 'fees-mintSkill2'),
      seededSigner(umi, 'fees-mintSkill3'),
    ]
  );
  const feeBuilder = adminSetFeature(umi, {
    programId,
    featurePda: feesFeaturePda,
    payer,
    feature: feature('Fees', [feesFeature]),
  });

  // Mints.
  const mintBuilders = mints.map((mint) =>
    createMint(umi, {
      mint,
      mintAuthority: programId.publicKey,
      freezeAuthority: programId.publicKey,
    })
  );
  const builder = transactionBuilder().add(feeBuilder).add(mintBuilders);
  await transactionBuilderGroup(builder.unsafeSplitByTransactionSize(umi))
    .parallel()
    .sendAndConfirm(umi);

  console.log({
    programBalance: displayAmount(
      await umi.rpc.getBalance(programId.publicKey)
    ),
    payerBalance: displayAmount(await umi.rpc.getBalance(payer.publicKey)),
  });
  featureContext = { feesFeaturePda, feesFeature };
  return featureContext;
};
