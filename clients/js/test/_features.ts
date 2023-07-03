/* eslint-disable import/no-extraneous-dependencies */
import {
  createMint,
  findAssociatedTokenPda,
  mintTokensTo,
} from '@metaplex-foundation/mpl-toolbox';
import {
  PublicKey,
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
  AdditionalOutputsFeatureAccountData,
  FeesFeatureAccountData,
  Key,
  MaxSupplyFeatureAccountData,
  SolPaymentFeatureAccountData,
  TransferInputsFeatureAccountData,
  WisdomFeatureAccountData,
  adminSetFeature,
  feature,
  findAdditionalOutputsFeaturePda,
  findFeesFeaturePda,
  findMaxSupplyFeaturePda,
  findSolPaymentFeaturePda,
  findTransferInputsFeaturePda,
  findWisdomFeaturePda,
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
  const feesBuilder = adminSetFeature(umi, {
    programId,
    featurePda: feesFeaturePda,
    payer,
    feature: feature('Fees', [feesFeature]),
  });

  // Additional outputs.
  const [additionalOutputsFeaturePda] = findAdditionalOutputsFeaturePda(umi);
  const additionalOutputsFeature: AdditionalOutputsFeatureAccountData = {
    key: Key.AdditionalOutputsFeature,
    mintBurn1: seededSigner(umi, 'additionalOutputs-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'additionalOutputs-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'additionalOutputs-mintBurn3').publicKey,
    mintSkill1: seededSigner(umi, 'additionalOutputs-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'additionalOutputs-mintSkill2').publicKey,
  };
  const additionalOutputsBuilder = adminSetFeature(umi, {
    programId,
    featurePda: additionalOutputsFeaturePda,
    payer,
    feature: feature('AdditionalOutputs', [additionalOutputsFeature]),
  });

  // Transfer inputs.
  const [transferInputsFeaturePda] = findTransferInputsFeaturePda(umi);
  const transferInputsFeature: TransferInputsFeatureAccountData = {
    key: Key.TransferInputsFeature,
    mintBurn1: seededSigner(umi, 'transferInputs-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'transferInputs-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'transferInputs-mintBurn3').publicKey,
    mintSkill1: seededSigner(umi, 'transferInputs-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'transferInputs-mintSkill2').publicKey,
  };
  const transferInputsBuilder = adminSetFeature(umi, {
    programId,
    featurePda: transferInputsFeaturePda,
    payer,
    feature: feature('TransferInputs', [transferInputsFeature]),
  });

  // Max supply.
  const [maxSupplyFeaturePda] = findMaxSupplyFeaturePda(umi);
  const maxSupplyFeature: MaxSupplyFeatureAccountData = {
    key: Key.MaxSupplyFeature,
    mintBurn1: seededSigner(umi, 'maxSupply-mintBurn1').publicKey,
    mintSkill1: seededSigner(umi, 'maxSupply-mintSkill1').publicKey,
  };
  const maxSupplyBuilder = adminSetFeature(umi, {
    programId,
    featurePda: maxSupplyFeaturePda,
    payer,
    feature: feature('MaxSupply', [maxSupplyFeature]),
  });

  // Sol payment.
  const [solPaymentFeaturePda] = findSolPaymentFeaturePda(umi);
  const solPaymentFeature: SolPaymentFeatureAccountData = {
    key: Key.SolPaymentFeature,
    mintBurn1: seededSigner(umi, 'solPayment-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'solPayment-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'solPayment-mintBurn3').publicKey,
    mintBurn4: seededSigner(umi, 'solPayment-mintBurn4').publicKey,
    mintBurn5: seededSigner(umi, 'solPayment-mintBurn5').publicKey,
    mintBurn6: seededSigner(umi, 'solPayment-mintBurn6').publicKey,
    mintBurn7: seededSigner(umi, 'solPayment-mintBurn7').publicKey,
    mintBurn8: seededSigner(umi, 'solPayment-mintBurn8').publicKey,
    mintBurn9: seededSigner(umi, 'solPayment-mintBurn9').publicKey,
    mintSkill1: seededSigner(umi, 'solPayment-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'solPayment-mintSkill2').publicKey,
    mintSkill3: seededSigner(umi, 'solPayment-mintSkill3').publicKey,
    mintSkill4: seededSigner(umi, 'solPayment-mintSkill4').publicKey,
    mintSkill5: seededSigner(umi, 'solPayment-mintSkill5').publicKey,
  };
  const solPaymentBuilder = adminSetFeature(umi, {
    programId,
    featurePda: solPaymentFeaturePda,
    payer,
    feature: feature('SolPayment', [solPaymentFeature]),
  });

  // Wisdom.
  const [wisdomFeaturePda] = findWisdomFeaturePda(umi);
  const wisdomFeature: WisdomFeatureAccountData = {
    key: Key.WisdomFeature,
    experienceMint: seededSigner(umi, 'wisdom-experienceMint').publicKey,
    mintBurn1: seededSigner(umi, 'wisdom-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'wisdom-mintBurn2').publicKey,
  };
  const wisdomBuilder = adminSetFeature(umi, {
    programId,
    featurePda: wisdomFeaturePda,
    payer,
    feature: feature('Wisdom', [wisdomFeature]),
  });

  await transactionBuilderGroup(
    transactionBuilder()
      .add(feesBuilder)
      .add(additionalOutputsBuilder)
      .add(transferInputsBuilder)
      .add(maxSupplyBuilder)
      .add(solPaymentBuilder)
      .add(wisdomBuilder)
      .unsafeSplitByTransactionSize(umi)
  ).sendAndConfirm(umi);

  console.log({
    programBalance: displayAmount(
      await umi.rpc.getBalance(programId.publicKey)
    ),
    payerBalance: displayAmount(await umi.rpc.getBalance(payer.publicKey)),
  });
  featureContext = { feesFeaturePda, feesFeature };
  return featureContext;
};

export const mintFeature = async (
  umi: Umi,
  seed: string,
  destination: PublicKey,
  amount: number | bigint
) => {
  const mint = seededSigner(umi, seed);
  const programId = localnetSigner(umi);
  let builder = transactionBuilder();

  if (!(await umi.rpc.accountExists(mint.publicKey))) {
    builder = builder.add(
      createMint(umi, {
        mint,
        mintAuthority: programId.publicKey,
        freezeAuthority: programId.publicKey,
      })
    );
  }

  builder = builder.add(
    mintTokensTo(umi, {
      mint: mint.publicKey,
      token: findAssociatedTokenPda(umi, {
        mint: mint.publicKey,
        owner: destination,
      }),
      amount,
      mintAuthority: programId,
    })
  );

  await builder.sendAndConfirm(umi);
};
