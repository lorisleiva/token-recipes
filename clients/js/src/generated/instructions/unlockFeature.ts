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
import { addAccountMeta, addObjectProperty } from '../shared';

// Accounts.
export type UnlockFeatureInstructionAccounts = {
  /** The address of the recipe account */
  recipe: PublicKey | Pda;
  /** The feature PDA to level up */
  featurePda: PublicKey | Pda;
  /** The authority of the recipe account */
  authority?: Signer;
  /** The owner of the token account, usually the same as the authority */
  owner?: Signer;
  /** The mint account that unlocks the feature */
  mint: PublicKey | Pda;
  /** The token account linking the mint and owner accounts */
  token?: PublicKey | Pda;
  /** The token program */
  tokenProgram?: PublicKey | Pda;
};

// Data.
export type UnlockFeatureInstructionData = { discriminator: number };

export type UnlockFeatureInstructionDataArgs = {};

/** @deprecated Use `getUnlockFeatureInstructionDataSerializer()` without any argument instead. */
export function getUnlockFeatureInstructionDataSerializer(
  _context: object
): Serializer<UnlockFeatureInstructionDataArgs, UnlockFeatureInstructionData>;
export function getUnlockFeatureInstructionDataSerializer(): Serializer<
  UnlockFeatureInstructionDataArgs,
  UnlockFeatureInstructionData
>;
export function getUnlockFeatureInstructionDataSerializer(
  _context: object = {}
): Serializer<UnlockFeatureInstructionDataArgs, UnlockFeatureInstructionData> {
  return mapSerializer<
    UnlockFeatureInstructionDataArgs,
    any,
    UnlockFeatureInstructionData
  >(
    struct<UnlockFeatureInstructionData>([['discriminator', u8()]], {
      description: 'UnlockFeatureInstructionData',
    }),
    (value) => ({ ...value, discriminator: 8 })
  ) as Serializer<
    UnlockFeatureInstructionDataArgs,
    UnlockFeatureInstructionData
  >;
}

// Instruction.
export function unlockFeature(
  context: Pick<Context, 'programs' | 'eddsa' | 'identity'>,
  input: UnlockFeatureInstructionAccounts
): TransactionBuilder {
  const signers: Signer[] = [];
  const keys: AccountMeta[] = [];

  // Program ID.
  const programId = context.programs.getPublicKey(
    'tokenRecipes',
    '6EgVKvZu2V6cpZzarvDHuyeJwa1NB2ujj8hXY98pQpLE'
  );

  // Resolved inputs.
  const resolvedAccounts = {
    recipe: [input.recipe, true] as const,
    featurePda: [input.featurePda, false] as const,
    mint: [input.mint, true] as const,
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
    'owner',
    input.owner
      ? ([input.owner, false] as const)
      : ([context.identity, false] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'token',
    input.token
      ? ([input.token, true] as const)
      : ([
          findAssociatedTokenPda(context, {
            mint: publicKey(input.mint, false),
            owner: publicKey(resolvedAccounts.owner[0], false),
          }),
          true,
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
  addAccountMeta(keys, signers, resolvedAccounts.featurePda, false);
  addAccountMeta(keys, signers, resolvedAccounts.authority, false);
  addAccountMeta(keys, signers, resolvedAccounts.owner, false);
  addAccountMeta(keys, signers, resolvedAccounts.mint, false);
  addAccountMeta(keys, signers, resolvedAccounts.token, false);
  addAccountMeta(keys, signers, resolvedAccounts.tokenProgram, false);

  // Data.
  const data = getUnlockFeatureInstructionDataSerializer().serialize({});

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}
