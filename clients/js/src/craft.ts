import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import {
  Context,
  Pda,
  PublicKey,
  TransactionBuilder,
  publicKey,
} from '@metaplex-foundation/umi';
import { findDelegatedIngredientPda } from './generated';
import {
  CraftInstructionAccounts,
  CraftInstructionArgs,
  CraftInstructionData,
  CraftInstructionDataArgs,
  craft as baseCraft,
  getCraftInstructionDataSerializer,
} from './generated/instructions/craft';

export {
  CraftInstructionAccounts,
  CraftInstructionArgs,
  CraftInstructionData,
  CraftInstructionDataArgs,
  getCraftInstructionDataSerializer,
};

export type BurnTokenInputCraftArgs = {
  __kind: 'BurnToken';
  mint: PublicKey;
  token?: PublicKey | Pda;
};
export type TransferTokenInputCraftArgs = {
  __kind: 'TransferToken';
  mint: PublicKey;
  token?: PublicKey | Pda;
  destination: PublicKey;
  destinationToken?: PublicKey | Pda;
};
export type TransferSolInputCraftArgs = {
  __kind: 'TransferSol';
  destination: PublicKey;
};
export type IngredientInputCraftArgs =
  | BurnTokenInputCraftArgs
  | TransferTokenInputCraftArgs
  | TransferSolInputCraftArgs;

export type MintTokenOutputCraftArgs = {
  __kind: 'MintToken';
  mint: PublicKey;
  token?: PublicKey | Pda;
};
export type MintTokenWithMaxSupplyOutputCraftArgs = {
  __kind: 'MintTokenWithMaxSupply';
  mint: PublicKey;
  token?: PublicKey | Pda;
};
export type IngredientOutputCraftArgs =
  | MintTokenOutputCraftArgs
  | MintTokenWithMaxSupplyOutputCraftArgs;

export type CraftInstructionInput = Parameters<typeof baseCraft>[1] & {
  inputs?: IngredientInputCraftArgs[];
  outputs?: IngredientOutputCraftArgs[];
};

// Instruction.
export function craft(
  context: Parameters<typeof baseCraft>[0] & Pick<Context, 'eddsa'>,
  input: CraftInstructionInput
): TransactionBuilder {
  const { inputs, outputs, ...baseInput } = input;
  const owner = (input.owner ?? context.identity).publicKey;
  let builder = baseCraft(context, baseInput);

  // Inputs.
  inputs?.forEach((inputArgs) => {
    if (inputArgs.__kind === 'BurnToken') {
      const { mint } = inputArgs;
      const token =
        inputArgs.token ?? findAssociatedTokenPda(context, { owner, mint });
      builder = builder.addRemainingAccounts([
        { pubkey: mint, isWritable: true, isSigner: false },
        { pubkey: publicKey(token, false), isWritable: true, isSigner: false },
      ]);
    } else if (inputArgs.__kind === 'TransferToken') {
      const { mint, destination } = inputArgs;
      const token =
        inputArgs.token ?? findAssociatedTokenPda(context, { owner, mint });
      const destinationToken =
        inputArgs.destinationToken ??
        findAssociatedTokenPda(context, { owner: destination, mint });
      builder = builder.addRemainingAccounts([
        { pubkey: mint, isWritable: true, isSigner: false },
        { pubkey: publicKey(token, false), isWritable: true, isSigner: false },
        { pubkey: destination, isWritable: false, isSigner: false },
        {
          pubkey: publicKey(destinationToken, false),
          isWritable: true,
          isSigner: false,
        },
      ]);
    } else if (inputArgs.__kind === 'TransferSol') {
      const { destination } = inputArgs;
      builder = builder.addRemainingAccounts([
        { pubkey: destination, isWritable: true, isSigner: false },
      ]);
    }
  });

  // Outputs.
  outputs?.forEach((outputArgs) => {
    if (
      outputArgs.__kind === 'MintToken' ||
      outputArgs.__kind === 'MintTokenWithMaxSupply'
    ) {
      const { mint } = outputArgs;
      const token =
        outputArgs.token ?? findAssociatedTokenPda(context, { owner, mint });
      builder = builder.addRemainingAccounts([
        { pubkey: mint, isWritable: true, isSigner: false },
        { pubkey: publicKey(token, false), isWritable: true, isSigner: false },
        {
          pubkey: findDelegatedIngredientPda(context, { mint })[0],
          isWritable: false,
          isSigner: false,
        },
      ]);
    }
  });

  return builder;
}
