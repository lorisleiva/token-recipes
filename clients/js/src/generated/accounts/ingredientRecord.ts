/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Account,
  Context,
  Pda,
  PublicKey,
  RpcAccount,
  RpcGetAccountOptions,
  RpcGetAccountsOptions,
  assertAccountExists,
  deserializeAccount,
  gpaBuilder,
  publicKey as toPublicKey,
} from '@metaplex-foundation/umi';
import {
  Serializer,
  bool,
  publicKey as publicKeySerializer,
  string,
  struct,
} from '@metaplex-foundation/umi/serializers';
import { Key, KeyArgs, getKeySerializer } from '../types';

export type IngredientRecord = Account<IngredientRecordAccountData>;

export type IngredientRecordAccountData = {
  key: Key;
  input: boolean;
  output: boolean;
  mint: PublicKey;
  recipe: PublicKey;
};

export type IngredientRecordAccountDataArgs = {
  key: KeyArgs;
  input: boolean;
  output: boolean;
  mint: PublicKey;
  recipe: PublicKey;
};

/** @deprecated Use `getIngredientRecordAccountDataSerializer()` without any argument instead. */
export function getIngredientRecordAccountDataSerializer(
  _context: object
): Serializer<IngredientRecordAccountDataArgs, IngredientRecordAccountData>;
export function getIngredientRecordAccountDataSerializer(): Serializer<
  IngredientRecordAccountDataArgs,
  IngredientRecordAccountData
>;
export function getIngredientRecordAccountDataSerializer(
  _context: object = {}
): Serializer<IngredientRecordAccountDataArgs, IngredientRecordAccountData> {
  return struct<IngredientRecordAccountData>(
    [
      ['key', getKeySerializer()],
      ['input', bool()],
      ['output', bool()],
      ['mint', publicKeySerializer()],
      ['recipe', publicKeySerializer()],
    ],
    { description: 'IngredientRecordAccountData' }
  ) as Serializer<IngredientRecordAccountDataArgs, IngredientRecordAccountData>;
}

/** @deprecated Use `deserializeIngredientRecord(rawAccount)` without any context instead. */
export function deserializeIngredientRecord(
  context: object,
  rawAccount: RpcAccount
): IngredientRecord;
export function deserializeIngredientRecord(
  rawAccount: RpcAccount
): IngredientRecord;
export function deserializeIngredientRecord(
  context: RpcAccount | object,
  rawAccount?: RpcAccount
): IngredientRecord {
  return deserializeAccount(
    rawAccount ?? (context as RpcAccount),
    getIngredientRecordAccountDataSerializer()
  );
}

export async function fetchIngredientRecord(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<IngredientRecord> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'IngredientRecord');
  return deserializeIngredientRecord(maybeAccount);
}

export async function safeFetchIngredientRecord(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<IngredientRecord | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists ? deserializeIngredientRecord(maybeAccount) : null;
}

export async function fetchAllIngredientRecord(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<IngredientRecord[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'IngredientRecord');
    return deserializeIngredientRecord(maybeAccount);
  });
}

export async function safeFetchAllIngredientRecord(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<IngredientRecord[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) =>
      deserializeIngredientRecord(maybeAccount as RpcAccount)
    );
}

export function getIngredientRecordGpaBuilder(
  context: Pick<Context, 'rpc' | 'programs'>
) {
  const programId = context.programs.getPublicKey(
    'tokenRecipes',
    'C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T'
  );
  return gpaBuilder(context, programId)
    .registerFields<{
      key: KeyArgs;
      input: boolean;
      output: boolean;
      mint: PublicKey;
      recipe: PublicKey;
    }>({
      key: [0, getKeySerializer()],
      input: [1, bool()],
      output: [2, bool()],
      mint: [3, publicKeySerializer()],
      recipe: [35, publicKeySerializer()],
    })
    .deserializeUsing<IngredientRecord>((account) =>
      deserializeIngredientRecord(account)
    );
}

export function getIngredientRecordSize(): number {
  return 67;
}

export function findIngredientRecordPda(
  context: Pick<Context, 'eddsa' | 'programs'>,
  seeds: {
    /** The mint address of the ingredient */
    mint: PublicKey;
    /** The address of the recipe */
    recipe: PublicKey;
  }
): Pda {
  const programId = context.programs.getPublicKey(
    'tokenRecipes',
    'C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T'
  );
  return context.eddsa.findPda(programId, [
    string({ size: 'variable' }).serialize('ingredient_record'),
    publicKeySerializer().serialize(seeds.mint),
    publicKeySerializer().serialize(seeds.recipe),
  ]);
}

export async function fetchIngredientRecordFromSeeds(
  context: Pick<Context, 'eddsa' | 'programs' | 'rpc'>,
  seeds: Parameters<typeof findIngredientRecordPda>[1],
  options?: RpcGetAccountOptions
): Promise<IngredientRecord> {
  return fetchIngredientRecord(
    context,
    findIngredientRecordPda(context, seeds),
    options
  );
}

export async function safeFetchIngredientRecordFromSeeds(
  context: Pick<Context, 'eddsa' | 'programs' | 'rpc'>,
  seeds: Parameters<typeof findIngredientRecordPda>[1],
  options?: RpcGetAccountOptions
): Promise<IngredientRecord | null> {
  return safeFetchIngredientRecord(
    context,
    findIngredientRecordPda(context, seeds),
    options
  );
}
