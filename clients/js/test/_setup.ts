/* eslint-disable import/no-extraneous-dependencies */
import {
  createAssociatedToken,
  createMint,
  findAssociatedTokenPda,
  mintTokensTo,
} from '@metaplex-foundation/mpl-toolbox';
import {
  PublicKey,
  PublicKeyInput,
  Signer,
  Umi,
  generateSigner,
  publicKey,
} from '@metaplex-foundation/umi';
import { createUmi as basecreateUmi } from '@metaplex-foundation/umi-bundle-tests';
import {
  IngredientType,
  activateRecipe,
  addIngredient,
  createRecipe as baseCreateRecipe,
  tokenRecipes,
} from '../src';

export const createUmi = async () =>
  (await basecreateUmi()).use(tokenRecipes());

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
    inputs?: Array<{
      mint: PublicKeyInput;
      amount: number | bigint;
      destination?: PublicKeyInput;
    }>;
    outputs?: Array<{
      mint: PublicKeyInput;
      amount: number | bigint;
      maxSupply?: number | bigint;
    }>;
  }
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
    builder = builder.add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: publicKey(ingredientInput.mint),
        authority,
        payer,
        ingredientType: IngredientType.Input,
        amount: ingredientInput.amount,
      })
    );
  });

  input.outputs?.forEach((ingredientOutput) => {
    builder = builder.add(
      addIngredient(umi, {
        recipe: recipe.publicKey,
        mint: publicKey(ingredientOutput.mint),
        authority,
        payer,
        ingredientType: IngredientType.Output,
        amount: ingredientOutput.amount,
        maxSupply: ingredientOutput.maxSupply,
      })
    );
  });

  if (input.active === true) {
    builder = builder.add(
      activateRecipe(umi, { recipe: recipe.publicKey, authority })
    );
  }

  await builder.sendAndConfirm(umi);

  return recipe.publicKey;
};
