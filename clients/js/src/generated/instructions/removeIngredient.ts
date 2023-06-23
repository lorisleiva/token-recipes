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
  u8,
} from '@metaplex-foundation/umi/serializers';
import { addAccountMeta, addObjectProperty } from '../shared';
import {
  IngredientType,
  IngredientTypeArgs,
  getIngredientTypeSerializer,
} from '../types';

// Accounts.
export type RemoveIngredientInstructionAccounts = {
  /** The address of the recipe account */
  recipe: PublicKey | Pda;
  /** The mint account of the ingredient */
  mint: PublicKey | Pda;
  /** The ingredient record PDA to discover their recipes */
  ingredientRecord: PublicKey | Pda;
  /** The delegated ingredient PDA for output ingredients that takes over the mint authority */
  delegatedIngredient?: PublicKey | Pda;
  /** The authority of the recipe account and the mint authority of the ingredient if it's an output ingredient */
  authority?: Signer;
  /** The account paying for the storage fees */
  payer?: Signer;
  /** The system program */
  systemProgram?: PublicKey | Pda;
  /** The token program */
  tokenProgram?: PublicKey | Pda;
};

// Data.
export type RemoveIngredientInstructionData = {
  discriminator: number;
  ingredientType: IngredientType;
};

export type RemoveIngredientInstructionDataArgs = {
  ingredientType: IngredientTypeArgs;
};

/** @deprecated Use `getRemoveIngredientInstructionDataSerializer()` without any argument instead. */
export function getRemoveIngredientInstructionDataSerializer(
  _context: object
): Serializer<
  RemoveIngredientInstructionDataArgs,
  RemoveIngredientInstructionData
>;
export function getRemoveIngredientInstructionDataSerializer(): Serializer<
  RemoveIngredientInstructionDataArgs,
  RemoveIngredientInstructionData
>;
export function getRemoveIngredientInstructionDataSerializer(
  _context: object = {}
): Serializer<
  RemoveIngredientInstructionDataArgs,
  RemoveIngredientInstructionData
> {
  return mapSerializer<
    RemoveIngredientInstructionDataArgs,
    any,
    RemoveIngredientInstructionData
  >(
    struct<RemoveIngredientInstructionData>(
      [
        ['discriminator', u8()],
        ['ingredientType', getIngredientTypeSerializer()],
      ],
      { description: 'RemoveIngredientInstructionData' }
    ),
    (value) => ({ ...value, discriminator: 2 })
  ) as Serializer<
    RemoveIngredientInstructionDataArgs,
    RemoveIngredientInstructionData
  >;
}

// Args.
export type RemoveIngredientInstructionArgs =
  RemoveIngredientInstructionDataArgs;

// Instruction.
export function removeIngredient(
  context: Pick<Context, 'programs' | 'identity' | 'payer'>,
  input: RemoveIngredientInstructionAccounts & RemoveIngredientInstructionArgs
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
    mint: [input.mint, true] as const,
    ingredientRecord: [input.ingredientRecord, true] as const,
  };
  const resolvingArgs = {};
  addObjectProperty(
    resolvedAccounts,
    'delegatedIngredient',
    input.delegatedIngredient
      ? ([input.delegatedIngredient, true] as const)
      : ([programId, false] as const)
  );
  addObjectProperty(
    resolvedAccounts,
    'authority',
    input.authority
      ? ([input.authority, false] as const)
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
  const resolvedArgs = { ...input, ...resolvingArgs };

  addAccountMeta(keys, signers, resolvedAccounts.recipe, false);
  addAccountMeta(keys, signers, resolvedAccounts.mint, false);
  addAccountMeta(keys, signers, resolvedAccounts.ingredientRecord, false);
  addAccountMeta(keys, signers, resolvedAccounts.delegatedIngredient, false);
  addAccountMeta(keys, signers, resolvedAccounts.authority, false);
  addAccountMeta(keys, signers, resolvedAccounts.payer, false);
  addAccountMeta(keys, signers, resolvedAccounts.systemProgram, false);
  addAccountMeta(keys, signers, resolvedAccounts.tokenProgram, false);

  // Data.
  const data =
    getRemoveIngredientInstructionDataSerializer().serialize(resolvedArgs);

  // Bytes Created On Chain.
  const bytesCreatedOnChain = 0;

  return transactionBuilder([
    { instruction: { keys, programId, data }, signers, bytesCreatedOnChain },
  ]);
}