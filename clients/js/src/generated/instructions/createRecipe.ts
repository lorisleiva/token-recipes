/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  ACCOUNT_HEADER_SIZE,
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
import { findRecipePda } from '../accounts';
import { addAccountMeta, addObjectProperty } from '../shared';

// Accounts.
export type CreateRecipeInstructionAccounts = {
  /** An address to derive the recipe address from */
  base: Signer;
  /** The PDA of the new recipe account */
  recipe?: PublicKey | Pda;
  /** The authority of the new recipe account */
  authority?: PublicKey | Pda;
  /** The account paying for the storage fees */
  payer?: Signer;
  /** The system program */
  systemProgram?: PublicKey | Pda;
};

// Data.
export type CreateRecipeInstructionData = { discriminator: number };

export type CreateRecipeInstructionDataArgs = {};

/** @deprecated Use `getCreateRecipeInstructionDataSerializer()` without any argument instead. */
export function getCreateRecipeInstructionDataSerializer(
  _context: object
): Serializer<CreateRecipeInstructionDataArgs, CreateRecipeInstructionData>;
export function getCreateRecipeInstructionDataSerializer(): Serializer<
  CreateRecipeInstructionDataArgs,
  CreateRecipeInstructionData
>;
export function getCreateRecipeInstructionDataSerializer(
  _context: object = {}
): Serializer<CreateRecipeInstructionDataArgs, CreateRecipeInstructionData> {
  return mapSerializer<
    CreateRecipeInstructionDataArgs,
    any,
    CreateRecipeInstructionData
  >(
    struct<CreateRecipeInstructionData>([['discriminator', u8()]], {
      description: 'CreateRecipeInstructionData',
    }),
    (value) => ({ ...value, discriminator: 0 })
  ) as Serializer<CreateRecipeInstructionDataArgs, CreateRecipeInstructionData>;
}

// Instruction.
export function createRecipe(
  context: Pick<Context, 'programs' | 'eddsa' | 'identity' | 'payer'>,
  input: CreateRecipeInstructionAccounts
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
    base: [input.base, false] as const,
  };
  addObjectProperty(
    resolvedAccounts,
    'recipe',
    input.recipe
      ? ([input.recipe, true] as const)
      : ([
          findRecipePda(context, { base: publicKey(input.base, false) }),
          true,
        ] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'authority',
    input.authority
      ? ([input.authority, false] as const)
      : ([context.identity.publicKey, false] as const)
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

  addAccountMeta(keys, signers, resolvedAccounts.base, false);
  addAccountMeta(keys, signers, resolvedAccounts.recipe, false);
  addAccountMeta(keys, signers, resolvedAccounts.authority, false);
  addAccountMeta(keys, signers, resolvedAccounts.payer, false);
  addAccountMeta(keys, signers, resolvedAccounts.systemProgram, false);

  // Data.
  const data = getCreateRecipeInstructionDataSerializer().serialize({});

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 42 + ACCOUNT_HEADER_SIZE;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}
