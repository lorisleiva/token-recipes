/* eslint-disable import/no-extraneous-dependencies */
import {
  closeToken,
  createAssociatedToken,
  createMint,
  createTokenIfMissing,
  findAssociatedTokenPda,
  mintTokensTo,
} from '@metaplex-foundation/mpl-toolbox';
import {
  Pda,
  PublicKey,
  PublicKeyInput,
  Signer,
  Umi,
  createSignerFromKeypair,
  defaultPublicKey,
  generateSigner,
  publicKey,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import { createUmi as baseCreateUmi } from '@metaplex-foundation/umi-bundle-tests';
import { string } from '@metaplex-foundation/umi/serializers';
import { readFileSync } from 'fs';
import path from 'path';
import {
  FeatureLevels,
  IngredientInputArgs,
  IngredientOutputArgs,
  IngredientType,
  activateRecipe,
  addIngredient,
  createRecipe as baseCreateRecipe,
  findAdditionalOutputsFeaturePda,
  findFeesFeaturePda,
  findMaxSupplyFeaturePda,
  findSolPaymentFeaturePda,
  findTransferInputsFeaturePda,
  findWisdomFeaturePda,
  tokenRecipes,
  unlockFeature,
} from '../src';

export const createUmi = async () =>
  (await baseCreateUmi()).use(tokenRecipes());

export const createMintWithHolders = async (
  umi: Umi,
  input: Partial<Omit<Parameters<typeof createMint>[1], 'mintAuthority'>> & {
    mintAuthority?: Signer;
    holders: Array<{ owner: PublicKeyInput; amount: number | bigint }>;
  }
): Promise<[PublicKey, ...PublicKey[]]> => {
  const atas = [] as PublicKey[];
  const mint = input.mint ?? generateSigner(umi);
  const mintAuthority = input.mintAuthority ?? umi.identity;
  let builder = createMint(umi, {
    ...input,
    mint,
    mintAuthority: mintAuthority.publicKey,
  });
  input.holders.forEach((holder) => {
    const owner = publicKey(holder.owner);
    const [token] = findAssociatedTokenPda(umi, {
      mint: mint.publicKey,
      owner,
    });
    atas.push(token);
    builder = builder.add(
      createAssociatedToken(umi, { mint: mint.publicKey, owner })
    );
    if (holder.amount > 0) {
      builder = builder.add(
        mintTokensTo(umi, {
          mint: mint.publicKey,
          token,
          amount: holder.amount,
          mintAuthority,
        })
      );
    }
  });
  await builder.sendAndConfirm(umi);

  return [mint.publicKey, ...atas];
};

export const createRecipe = async (
  umi: Umi,
  input: Omit<Partial<Parameters<typeof baseCreateRecipe>[1]>, 'authority'> & {
    authority?: Signer;
    active?: boolean;
    inputs?: Array<IngredientInputArgs>;
    outputs?: Array<IngredientOutputArgs>;
  } = {}
): Promise<PublicKey> => {
  const recipe = input.recipe ?? generateSigner(umi);
  const authority = input.authority ?? umi.identity;
  const payer = input.payer ?? umi.payer;
  let builder = baseCreateRecipe(umi, {
    recipe,
    authority: authority.publicKey,
    payer,
  });

  input.inputs?.forEach((ingredientInput) => {
    if (ingredientInput.__kind === 'BurnToken') {
      builder = builder.add(
        addIngredient(umi, {
          recipe: recipe.publicKey,
          mint: publicKey(ingredientInput.mint),
          authority,
          payer,
          ingredientType: IngredientType.BurnTokenInput,
          amount: ingredientInput.amount,
        })
      );
    } else if (ingredientInput.__kind === 'TransferToken') {
      builder = builder.add(
        addIngredient(umi, {
          recipe: recipe.publicKey,
          mint: publicKey(ingredientInput.mint),
          authority,
          payer,
          ingredientType: IngredientType.TransferTokenInput,
          amount: ingredientInput.amount,
          destination: ingredientInput.destination,
        })
      );
    } else if (ingredientInput.__kind === 'TransferSol') {
      builder = builder.add(
        addIngredient(umi, {
          recipe: recipe.publicKey,
          mint: defaultPublicKey(),
          authority,
          payer,
          ingredientType: IngredientType.TransferSolInput,
          amount: ingredientInput.lamports,
          destination: ingredientInput.destination,
        })
      );
    }
  });

  input.outputs?.forEach((ingredientOutput) => {
    if (ingredientOutput.__kind === 'MintToken') {
      builder = builder.add(
        addIngredient(umi, {
          recipe: recipe.publicKey,
          mint: publicKey(ingredientOutput.mint),
          authority,
          payer,
          ingredientType: IngredientType.MintTokenOutput,
          amount: ingredientOutput.amount,
        })
      );
    } else if (ingredientOutput.__kind === 'MintTokenWithMaxSupply') {
      builder = builder.add(
        addIngredient(umi, {
          recipe: recipe.publicKey,
          mint: publicKey(ingredientOutput.mint),
          authority,
          payer,
          ingredientType: IngredientType.MintTokenWithMaxSupplyOutput,
          amount: ingredientOutput.amount,
          maxSupply: ingredientOutput.maxSupply,
        })
      );
    }
  });

  if (input.active === true) {
    builder = builder.add(
      activateRecipe(umi, { recipe: recipe.publicKey, authority })
    );
  }

  await builder.sendAndConfirm(umi);

  return recipe.publicKey;
};

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

export type FeatureConfig = {
  featureLevelKey: keyof FeatureLevels;
  seedPrefix: string;
  maxBurnSeed: string;
  pdaFactory: (umi: Umi) => Pda | PublicKey;
};

export const featureConfigs: Record<string, FeatureConfig> = {
  fees: {
    featureLevelKey: 'fees',
    seedPrefix: 'FEES',
    maxBurnSeed: 'mintBurn3',
    pdaFactory: findFeesFeaturePda,
  },
  additionalOutputs: {
    featureLevelKey: 'additionalOutputs',
    seedPrefix: 'ADDO',
    maxBurnSeed: 'mintBurn2',
    pdaFactory: findAdditionalOutputsFeaturePda,
  },
  transferInputs: {
    featureLevelKey: 'transferInputs',
    seedPrefix: 'TRIN',
    maxBurnSeed: 'mintBurn2',
    pdaFactory: findTransferInputsFeaturePda,
  },
  maxSupply: {
    featureLevelKey: 'maxSupply',
    seedPrefix: 'MAXS',
    maxBurnSeed: 'mintBurn1',
    pdaFactory: findMaxSupplyFeaturePda,
  },
  solPayment: {
    featureLevelKey: 'solPayment',
    seedPrefix: 'SOLP',
    maxBurnSeed: 'mintBurn5',
    pdaFactory: findSolPaymentFeaturePda,
  },
  wisdom: {
    featureLevelKey: 'wisdom',
    seedPrefix: 'WISD',
    maxBurnSeed: 'mintBurn2',
    pdaFactory: findWisdomFeaturePda,
  },
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
  const owner = destination ?? umi.identity.publicKey;
  const [ata] = findAssociatedTokenPda(umi, { mint: mint.publicKey, owner });

  await createTokenIfMissing(umi, { mint: mint.publicKey, owner })
    .add(
      mintTokensTo(umi, {
        mint: mint.publicKey,
        token: ata,
        amount,
        mintAuthority: programId,
      })
    )
    .sendAndConfirm(umi);

  return { mint: mint.publicKey, ata };
};

export const setFeatureLevel = async (
  umi: Umi,
  recipe: PublicKey,
  feature: string,
  level: number
) => {
  const featureConfig = featureConfigs[feature];
  const featurePda = featureConfig.pdaFactory(umi);
  const { mint: maxMint, ata: ataMax } = await mintFeature(
    umi,
    `${featureConfig.seedPrefix}-${featureConfig.maxBurnSeed}`,
    level
  );
  let builder = transactionBuilder();
  for (let i = 0; i < level; i += 1) {
    builder = builder.add(
      unlockFeature(umi, { recipe, featurePda, mint: maxMint })
    );
  }
  builder = builder.add(
    closeToken(umi, {
      account: ataMax,
      destination: umi.identity.publicKey,
      owner: umi.identity,
    })
  );
  await builder.sendAndConfirm(umi);
};
