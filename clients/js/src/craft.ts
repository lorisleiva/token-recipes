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

export type CraftInstructionInput = Parameters<typeof baseCraft>[1] & {
  inputs?: Array<{
    mint: PublicKey;
    token?: PublicKey | Pda;
    destinationToken?: PublicKey | Pda;
  }>;
  outputs?: Array<{
    mint: PublicKey;
    token?: PublicKey | Pda;
  }>;
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
  inputs?.forEach(({ mint, token, destinationToken }) => {
    token = token ?? findAssociatedTokenPda(context, { owner, mint });
    builder = builder.addRemainingAccounts([
      { pubkey: mint, isWritable: true, isSigner: false },
      { pubkey: publicKey(token, false), isWritable: true, isSigner: false },
      ...(destinationToken
        ? [
            {
              pubkey: publicKey(destinationToken, false),
              isWritable: true,
              isSigner: false,
            },
          ]
        : []),
    ]);
  });

  // Outputs.
  outputs?.forEach(({ mint, token }) => {
    token = token ?? findAssociatedTokenPda(context, { owner, mint });
    builder = builder.addRemainingAccounts([
      { pubkey: mint, isWritable: true, isSigner: false },
      { pubkey: publicKey(token, false), isWritable: true, isSigner: false },
      {
        pubkey: findDelegatedIngredientPda(context, { mint })[0],
        isWritable: false,
        isSigner: false,
      },
    ]);
  });

  return builder;
}
