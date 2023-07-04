/* eslint-disable import/no-extraneous-dependencies */
import {
  createAssociatedToken,
  createMint,
  fetchToken,
  findAssociatedTokenPda,
  mintTokensTo,
} from '@metaplex-foundation/mpl-toolbox';
import {
  Pda,
  PublicKey,
  Umi,
  createSignerFromKeypair,
  transactionBuilder,
  transactionBuilderGroup,
} from '@metaplex-foundation/umi';
import { string } from '@metaplex-foundation/umi/serializers';
import test from 'ava';
import { readFileSync } from 'fs';
import path from 'path';
import {
  AdditionalOutputsFeatureAccountData,
  FeatureLevels,
  FeesFeatureAccountData,
  Key,
  MaxSupplyFeatureAccountData,
  SolPaymentFeatureAccountData,
  TransferInputsFeatureAccountData,
  WisdomFeatureAccountData,
  adminSetFeature,
  feature,
  fetchRecipe,
  findAdditionalOutputsFeaturePda,
  findFeesFeaturePda,
  findMaxSupplyFeaturePda,
  findSolPaymentFeaturePda,
  findTransferInputsFeaturePda,
  findWisdomFeaturePda,
  unlockFeature,
} from '../src';
import { createRecipe, createUmi } from './_setup';

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
    string({ size: 32 }).serialize(`TR42-${seed}`)
  );
  return createSignerFromKeypair(umi, keypair);
};

export type FeatureContext = {
  feesFeaturePda: PublicKey;
  feesFeature: FeesFeatureAccountData;
  additionalOutputsFeaturePda: PublicKey;
  additionalOutputsFeature: AdditionalOutputsFeatureAccountData;
  transferInputsFeaturePda: PublicKey;
  transferInputsFeature: TransferInputsFeatureAccountData;
  maxSupplyFeaturePda: PublicKey;
  maxSupplyFeature: MaxSupplyFeatureAccountData;
  solPaymentFeaturePda: PublicKey;
  solPaymentFeature: SolPaymentFeatureAccountData;
  wisdomFeaturePda: PublicKey;
  wisdomFeature: WisdomFeatureAccountData;
};

let featureContext: FeatureContext | undefined;

export const withFeatures = async (umi: Umi): Promise<FeatureContext> => {
  if (featureContext) return featureContext;
  const programId = localnetSigner(umi);
  const { payer } = umi;

  // Fees.
  const [feesFeaturePda] = findFeesFeaturePda(umi);
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
    mintBurn1: seededSigner(umi, 'WISD-mintBurn1').publicKey,
    mintBurn2: seededSigner(umi, 'WISD-mintBurn2').publicKey,
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

  featureContext = {
    feesFeaturePda,
    feesFeature,
    additionalOutputsFeaturePda,
    additionalOutputsFeature,
    transferInputsFeaturePda,
    transferInputsFeature,
    maxSupplyFeaturePda,
    maxSupplyFeature,
    solPaymentFeaturePda,
    solPaymentFeature,
    wisdomFeaturePda,
    wisdomFeature,
  };
  return featureContext;
};

export const mintFeature = async (
  umi: Umi,
  seed: string,
  amount: number | bigint,
  destination?: PublicKey
): Promise<{
  mint: PublicKey;
  ata: PublicKey;
}> => {
  const mint = seededSigner(umi, seed);
  const programId = localnetSigner(umi);
  let builder = transactionBuilder();
  const owner = destination ?? umi.identity.publicKey;
  const [ata] = findAssociatedTokenPda(umi, { mint: mint.publicKey, owner });

  if (!(await umi.rpc.accountExists(mint.publicKey))) {
    builder = builder.add(
      createMint(umi, {
        mint,
        mintAuthority: programId.publicKey,
        freezeAuthority: programId.publicKey,
      })
    );
  }

  builder = builder
    .add(createAssociatedToken(umi, { mint: mint.publicKey, owner }))
    .add(
      mintTokensTo(umi, {
        mint: mint.publicKey,
        token: ata,
        amount,
        mintAuthority: programId,
      })
    );
  await builder.sendAndConfirm(umi);
  return { mint: mint.publicKey, ata };
};

export const getUnlockFeatureMacro = (
  featurePda: (umi: Umi) => Pda | PublicKey,
  featureKey: keyof FeatureLevels,
  featurePrefix: string
) =>
  test.macro({
    title: (providedTitle, _: number, mintSeed: string) =>
      providedTitle ?? `it can unlock using ${mintSeed} tokens`,
    exec: async (
      t,
      fromTokens: number,
      mintSeed: string,
      toTokens: number,
      toLevel: number
    ) => {
      // Given feature PDAs and an existing recipe.
      const umi = await createUmi();
      await withFeatures(umi);
      const recipe = await createRecipe(umi);

      // And given we own a token from a feature mint.
      const { mint, ata } = await mintFeature(
        umi,
        `${featurePrefix}-${mintSeed}`,
        fromTokens
      );

      // When we use it to unlock the additional outputs feature.
      await unlockFeature(umi, {
        recipe,
        featurePda: featurePda(umi),
        mint,
      }).sendAndConfirm(umi);

      // Then the recipe was updated to reflect the new feature level.
      const recipeAccount = await fetchRecipe(umi, recipe);
      t.is(recipeAccount.featureLevels[featureKey], toLevel);

      // And the token account was also potentially updated.
      const tokenAccount = await fetchToken(umi, ata);
      t.is(tokenAccount.amount, BigInt(toTokens));
    },
  });
