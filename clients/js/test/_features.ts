/* eslint-disable no-console */
/* eslint-disable import/no-extraneous-dependencies */
import { createMint } from '@metaplex-foundation/mpl-toolbox';
import {
  Signer,
  transactionBuilder,
  transactionBuilderGroup,
} from '@metaplex-foundation/umi';
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
import { createUmi, localnetSigner, seededSigner } from './_setup';

export const setupFeatures = async () => {
  const umi = await createUmi();
  const programId = localnetSigner(umi);
  const { payer } = umi;
  const mints = [] as Signer[];

  // Check if features are already set up.
  const [feesFeaturePda] = findFeesFeaturePda(umi);
  const featuresExist = await umi.rpc.accountExists(feesFeaturePda);
  if (featuresExist) {
    console.log('>> Features already set up. Skipping.');
    return;
  }
  console.log('>> Setting up features...');

  // Fees.
  const feesFeature: FeesFeatureAccountData = {
    key: Key.FeesFeature,
    adminDestination: seededSigner(umi, 'FEES-adminDestination').publicKey,
    shardMint: seededSigner(umi, 'FEES-shardMint').publicKey,
    mintBurn1: seededSigner(umi, 'FEES-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'FEES-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'FEES-mintBurn3').publicKey,
    mintBurn4: seededSigner(umi, 'FEES-mintBurn4').publicKey,
    mintBurn5: seededSigner(umi, 'FEES-mintBurn5').publicKey,
    mintSkill1: seededSigner(umi, 'FEES-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'FEES-mintSkill2').publicKey,
    mintSkill3: seededSigner(umi, 'FEES-mintSkill3').publicKey,
  };
  mints.push(
    seededSigner(umi, 'FEES-adminDestination'),
    seededSigner(umi, 'FEES-shardMint'),
    seededSigner(umi, 'FEES-mintBurn1'),
    seededSigner(umi, 'FEES-mintBurn2'),
    seededSigner(umi, 'FEES-mintBurn3'),
    seededSigner(umi, 'FEES-mintBurn4'),
    seededSigner(umi, 'FEES-mintBurn5'),
    seededSigner(umi, 'FEES-mintSkill1'),
    seededSigner(umi, 'FEES-mintSkill2'),
    seededSigner(umi, 'FEES-mintSkill3')
  );
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
    mintBurn1: seededSigner(umi, 'ADDO-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'ADDO-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'ADDO-mintBurn3').publicKey,
    mintSkill1: seededSigner(umi, 'ADDO-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'ADDO-mintSkill2').publicKey,
  };
  mints.push(
    seededSigner(umi, 'ADDO-mintBurn1'),
    seededSigner(umi, 'ADDO-mintBurn2'),
    seededSigner(umi, 'ADDO-mintBurn3'),
    seededSigner(umi, 'ADDO-mintSkill1'),
    seededSigner(umi, 'ADDO-mintSkill2')
  );
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
    mintBurn1: seededSigner(umi, 'TRIN-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'TRIN-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'TRIN-mintBurn3').publicKey,
    mintSkill1: seededSigner(umi, 'TRIN-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'TRIN-mintSkill2').publicKey,
  };
  mints.push(
    seededSigner(umi, 'TRIN-mintBurn1'),
    seededSigner(umi, 'TRIN-mintBurn2'),
    seededSigner(umi, 'TRIN-mintBurn3'),
    seededSigner(umi, 'TRIN-mintSkill1'),
    seededSigner(umi, 'TRIN-mintSkill2')
  );
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
    mintBurn1: seededSigner(umi, 'MAXS-mintBurn1').publicKey,
    mintSkill1: seededSigner(umi, 'MAXS-mintSkill1').publicKey,
  };
  mints.push(
    seededSigner(umi, 'MAXS-mintBurn1'),
    seededSigner(umi, 'MAXS-mintSkill1')
  );
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
    mintBurn1: seededSigner(umi, 'SOLP-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'SOLP-mintBurn2').publicKey,
    mintBurn3: seededSigner(umi, 'SOLP-mintBurn3').publicKey,
    mintBurn4: seededSigner(umi, 'SOLP-mintBurn4').publicKey,
    mintBurn5: seededSigner(umi, 'SOLP-mintBurn5').publicKey,
    mintBurn6: seededSigner(umi, 'SOLP-mintBurn6').publicKey,
    mintBurn7: seededSigner(umi, 'SOLP-mintBurn7').publicKey,
    mintBurn8: seededSigner(umi, 'SOLP-mintBurn8').publicKey,
    mintBurn9: seededSigner(umi, 'SOLP-mintBurn9').publicKey,
    mintSkill1: seededSigner(umi, 'SOLP-mintSkill1').publicKey,
    mintSkill2: seededSigner(umi, 'SOLP-mintSkill2').publicKey,
    mintSkill3: seededSigner(umi, 'SOLP-mintSkill3').publicKey,
    mintSkill4: seededSigner(umi, 'SOLP-mintSkill4').publicKey,
    mintSkill5: seededSigner(umi, 'SOLP-mintSkill5').publicKey,
  };
  mints.push(
    seededSigner(umi, 'SOLP-mintBurn1'),
    seededSigner(umi, 'SOLP-mintBurn2'),
    seededSigner(umi, 'SOLP-mintBurn3'),
    seededSigner(umi, 'SOLP-mintBurn4'),
    seededSigner(umi, 'SOLP-mintBurn5'),
    seededSigner(umi, 'SOLP-mintBurn6'),
    seededSigner(umi, 'SOLP-mintBurn7'),
    seededSigner(umi, 'SOLP-mintBurn8'),
    seededSigner(umi, 'SOLP-mintBurn9'),
    seededSigner(umi, 'SOLP-mintSkill1'),
    seededSigner(umi, 'SOLP-mintSkill2'),
    seededSigner(umi, 'SOLP-mintSkill3'),
    seededSigner(umi, 'SOLP-mintSkill4'),
    seededSigner(umi, 'SOLP-mintSkill5')
  );
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
    experienceMint: seededSigner(umi, 'WISD-experienceMint').publicKey,
    mintBurn1: seededSigner(umi, 'WISD-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'WISD-mintBurn2').publicKey,
  };
  mints.push(
    seededSigner(umi, 'WISD-experienceMint'),
    seededSigner(umi, 'WISD-mintBurn1'),
    seededSigner(umi, 'WISD-mintBurn2')
  );
  const wisdomBuilder = adminSetFeature(umi, {
    programId,
    featurePda: wisdomFeaturePda,
    payer,
    feature: feature('Wisdom', [wisdomFeature]),
  });

  // Mints.
  const mintBuilders = mints.map((mint) =>
    createMint(umi, {
      mint,
      mintAuthority: programId.publicKey,
      freezeAuthority: programId.publicKey,
    })
  );

  // Send all transactions.
  await transactionBuilderGroup(
    transactionBuilder()
      .add(feesBuilder)
      .add(additionalOutputsBuilder)
      .add(transferInputsBuilder)
      .add(maxSupplyBuilder)
      .add(solPaymentBuilder)
      .add(wisdomBuilder)
      .add(mintBuilders)
      .unsafeSplitByTransactionSize(umi)
  ).sendAndConfirm(umi);
};

setupFeatures();
