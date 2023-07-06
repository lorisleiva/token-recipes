/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { findAssociatedTokenPda } from '@metaplex-foundation/mpl-toolbox';
import {
  AccountMeta,
  Context,
  Pda,
  PublicKey,
  Signer,
  TransactionBuilder,
  publicKey,
  transactionBuilder,
} from '@metaplex-foundation/umi';
import {
  Serializer,
  mapSerializer,
  struct,
  u8,
} from '@metaplex-foundation/umi/serializers';
import { findFeesFeaturePda } from '../accounts';
import { addAccountMeta, addObjectProperty } from '../shared';

// Accounts.
export type CollectFeesInstructionAccounts = {
  /** The address of the recipe account */
  recipe: PublicKey | Pda;
  /** The authority of the recipe account */
  authority?: Signer;
  /** The account that receives admin fees */
  adminFeesDestination: PublicKey | Pda;
  /** The fees feature PDA storing the valid shard mint */
  feesFeaturePda?: PublicKey | Pda;
  /** The mint account of shard tokens */
  shardsMint: PublicKey | Pda;
  /** The shards token account of the authority */
  shardsToken?: PublicKey | Pda;
  /** The account paying for the storage fees, in case an associated token account needs to be created */
  payer?: Signer;
  /** The system program */
  systemProgram?: PublicKey | Pda;
  /** The token program */
  tokenProgram?: PublicKey | Pda;
};

// Data.
export type CollectFeesInstructionData = { discriminator: number };

export type CollectFeesInstructionDataArgs = {};

/** @deprecated Use `getCollectFeesInstructionDataSerializer()` without any argument instead. */
export function getCollectFeesInstructionDataSerializer(
  _context: object
): Serializer<CollectFeesInstructionDataArgs, CollectFeesInstructionData>;
export function getCollectFeesInstructionDataSerializer(): Serializer<
  CollectFeesInstructionDataArgs,
  CollectFeesInstructionData
>;
export function getCollectFeesInstructionDataSerializer(
  _context: object = {}
): Serializer<CollectFeesInstructionDataArgs, CollectFeesInstructionData> {
  return mapSerializer<
    CollectFeesInstructionDataArgs,
    any,
    CollectFeesInstructionData
  >(
    struct<CollectFeesInstructionData>([['discriminator', u8()]], {
      description: 'CollectFeesInstructionData',
    }),
    (value) => ({ ...value, discriminator: 10 })
  ) as Serializer<CollectFeesInstructionDataArgs, CollectFeesInstructionData>;
}

// Instruction.
export function collectFees(
  context: Pick<Context, 'programs' | 'eddsa' | 'identity' | 'payer'>,
  input: CollectFeesInstructionAccounts
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
    adminFeesDestination: [input.adminFeesDestination, true] as const,
    shardsMint: [input.shardsMint, true] as const,
  };
  addObjectProperty(
    resolvedAccounts,
    'authority',
    input.authority
      ? ([input.authority, false] as const)
      : ([context.identity, false] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'feesFeaturePda',
    input.feesFeaturePda
      ? ([input.feesFeaturePda, false] as const)
      : ([findFeesFeaturePda(context), false] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'shardsToken',
    input.shardsToken
      ? ([input.shardsToken, true] as const)
      : ([
          findAssociatedTokenPda(context, {
            mint: publicKey(input.shardsMint, false),
            owner: publicKey(resolvedAccounts.authority[0], false),
          }),
          true,
        ] as const)
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

  addAccountMeta(keys, signers, resolvedAccounts.recipe, false);
  addAccountMeta(keys, signers, resolvedAccounts.authority, false);
  addAccountMeta(keys, signers, resolvedAccounts.adminFeesDestination, false);
  addAccountMeta(keys, signers, resolvedAccounts.feesFeaturePda, false);
  addAccountMeta(keys, signers, resolvedAccounts.shardsMint, false);
  addAccountMeta(keys, signers, resolvedAccounts.shardsToken, false);
  addAccountMeta(keys, signers, resolvedAccounts.payer, false);
  addAccountMeta(keys, signers, resolvedAccounts.systemProgram, false);
  addAccountMeta(keys, signers, resolvedAccounts.tokenProgram, false);

  // Data.
  const data = getCollectFeesInstructionDataSerializer().serialize({});

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}
