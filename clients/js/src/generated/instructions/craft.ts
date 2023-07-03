/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  AccountMeta,
  Context,
  Pda,
  PublicKey,
  Signer,
  TransactionBuilder,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import {
  Serializer,
  mapSerializer,
  struct,
  u64,
  u8,
} from '@metaplex-foundation/umi/serializers';
import { addAccountMeta, addObjectProperty } from '../shared';

// Accounts.
export type CraftInstructionAccounts = {
  /** The address of the recipe account */
  recipe: PublicKey | Pda;
  /** The owner of the token accounts */
  owner?: Signer;
  /** The account paying for the storage fees if we have to create associated token accounts */
  payer?: Signer;
  /** The system program */
  systemProgram?: PublicKey | Pda;
  /** The token program */
  tokenProgram?: PublicKey | Pda;
  /** The associated token program */
  ataProgram?: PublicKey | Pda;
};

// Data.
export type CraftInstructionData = { discriminator: number; quantity: bigint };

export type CraftInstructionDataArgs = { quantity?: number | bigint };

/** @deprecated Use `getCraftInstructionDataSerializer()` without any argument instead. */
export function getCraftInstructionDataSerializer(
  _context: object
): Serializer<CraftInstructionDataArgs, CraftInstructionData>;
export function getCraftInstructionDataSerializer(): Serializer<
  CraftInstructionDataArgs,
  CraftInstructionData
>;
export function getCraftInstructionDataSerializer(
  _context: object = {}
): Serializer<CraftInstructionDataArgs, CraftInstructionData> {
  return mapSerializer<CraftInstructionDataArgs, any, CraftInstructionData>(
    struct<CraftInstructionData>(
      [
        ['discriminator', u8()],
        ['quantity', u64()],
      ],
      { description: 'CraftInstructionData' }
    ),
    (value) => ({ ...value, discriminator: 5, quantity: value.quantity ?? 1 })
  ) as Serializer<CraftInstructionDataArgs, CraftInstructionData>;
}

// Args.
export type CraftInstructionArgs = CraftInstructionDataArgs;

// Instruction.
export function craft(
  context: Pick<Context, 'programs' | 'identity' | 'payer'>,
  input: CraftInstructionAccounts & CraftInstructionArgs
): TransactionBuilder {
  const signers: Signer[] = [];
  const keys: AccountMeta[] = [];

  // Program ID.
  const programId = context.programs.getPublicKey(
    'tokenRecipes',
    'C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T'
  );

  // Resolved inputs.
  const resolvedAccounts = {
    recipe: [input.recipe, true] as const,
  };
  const resolvingArgs = {};
  addObjectProperty(
    resolvedAccounts,
    'owner',
    input.owner
      ? ([input.owner, false] as const)
      : ([context.identity, false] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'payer',
    input.payer
      ? ([input.payer, true] as const)
      : ([context.payer, true] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'systemProgram',
    input.systemProgram
      ? ([input.systemProgram, false] as const)
      : ([
          context.programs.getPublicKey(
            'splSystem',
            '11111111111111111111111111111111'
          ),
          false,
        ] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'tokenProgram',
    input.tokenProgram
      ? ([input.tokenProgram, false] as const)
      : ([
          context.programs.getPublicKey(
            'splToken',
            'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
          ),
          false,
        ] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'ataProgram',
    input.ataProgram
      ? ([input.ataProgram, false] as const)
      : ([
          context.programs.getPublicKey(
            'splAssociatedToken',
            'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
          ),
          false,
        ] as const)
  );
  const resolvedArgs = { ...input, ...resolvingArgs };

  addAccountMeta(keys, signers, resolvedAccounts.recipe, false);
  addAccountMeta(keys, signers, resolvedAccounts.owner, false);
  addAccountMeta(keys, signers, resolvedAccounts.payer, false);
  addAccountMeta(keys, signers, resolvedAccounts.systemProgram, false);
  addAccountMeta(keys, signers, resolvedAccounts.tokenProgram, false);
  addAccountMeta(keys, signers, resolvedAccounts.ataProgram, false);

  // Data.
  const data = getCraftInstructionDataSerializer().serialize(resolvedArgs);

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}
