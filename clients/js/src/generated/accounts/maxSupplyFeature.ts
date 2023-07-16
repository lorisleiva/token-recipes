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
  publicKey as publicKeySerializer,
  string,
  struct,
} from '@metaplex-foundation/umi/serializers';
import { Key, KeyArgs, getKeySerializer } from '../types';

export type MaxSupplyFeature = Account<MaxSupplyFeatureAccountData>;

export type MaxSupplyFeatureAccountData = {
  key: Key;
  mintBurn1: PublicKey;
  mintSkill1: PublicKey;
};

export type MaxSupplyFeatureAccountDataArgs = {
  key: KeyArgs;
  mintBurn1: PublicKey;
  mintSkill1: PublicKey;
};

/** @deprecated Use `getMaxSupplyFeatureAccountDataSerializer()` without any argument instead. */
export function getMaxSupplyFeatureAccountDataSerializer(
  _context: object
): Serializer<MaxSupplyFeatureAccountDataArgs, MaxSupplyFeatureAccountData>;
export function getMaxSupplyFeatureAccountDataSerializer(): Serializer<
  MaxSupplyFeatureAccountDataArgs,
  MaxSupplyFeatureAccountData
>;
export function getMaxSupplyFeatureAccountDataSerializer(
  _context: object = {}
): Serializer<MaxSupplyFeatureAccountDataArgs, MaxSupplyFeatureAccountData> {
  return struct<MaxSupplyFeatureAccountData>(
    [
      ['key', getKeySerializer()],
      ['mintBurn1', publicKeySerializer()],
      ['mintSkill1', publicKeySerializer()],
    ],
    { description: 'MaxSupplyFeatureAccountData' }
  ) as Serializer<MaxSupplyFeatureAccountDataArgs, MaxSupplyFeatureAccountData>;
}

/** @deprecated Use `deserializeMaxSupplyFeature(rawAccount)` without any context instead. */
export function deserializeMaxSupplyFeature(
  context: object,
  rawAccount: RpcAccount
): MaxSupplyFeature;
export function deserializeMaxSupplyFeature(
  rawAccount: RpcAccount
): MaxSupplyFeature;
export function deserializeMaxSupplyFeature(
  context: RpcAccount | object,
  rawAccount?: RpcAccount
): MaxSupplyFeature {
  return deserializeAccount(
    rawAccount ?? (context as RpcAccount),
    getMaxSupplyFeatureAccountDataSerializer()
  );
}

export async function fetchMaxSupplyFeature(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<MaxSupplyFeature> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'MaxSupplyFeature');
  return deserializeMaxSupplyFeature(maybeAccount);
}

export async function safeFetchMaxSupplyFeature(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<MaxSupplyFeature | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists ? deserializeMaxSupplyFeature(maybeAccount) : null;
}

export async function fetchAllMaxSupplyFeature(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<MaxSupplyFeature[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'MaxSupplyFeature');
    return deserializeMaxSupplyFeature(maybeAccount);
  });
}

export async function safeFetchAllMaxSupplyFeature(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<MaxSupplyFeature[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) =>
      deserializeMaxSupplyFeature(maybeAccount as RpcAccount)
    );
}

export function getMaxSupplyFeatureGpaBuilder(
  context: Pick<Context, 'rpc' | 'programs'>
) {
  const programId = context.programs.getPublicKey(
    'tokenRecipes',
    '6EgVKvZu2V6cpZzarvDHuyeJwa1NB2ujj8hXY98pQpLE'
  );
  return gpaBuilder(context, programId)
    .registerFields<{
      key: KeyArgs;
      mintBurn1: PublicKey;
      mintSkill1: PublicKey;
    }>({
      key: [0, getKeySerializer()],
      mintBurn1: [1, publicKeySerializer()],
      mintSkill1: [33, publicKeySerializer()],
    })
    .deserializeUsing<MaxSupplyFeature>((account) =>
      deserializeMaxSupplyFeature(account)
    );
}

export function getMaxSupplyFeatureSize(): number {
  return 65;
}

export function findMaxSupplyFeaturePda(
  context: Pick<Context, 'eddsa' | 'programs'>
): Pda {
  const programId = context.programs.getPublicKey(
    'tokenRecipes',
    '6EgVKvZu2V6cpZzarvDHuyeJwa1NB2ujj8hXY98pQpLE'
  );
  return context.eddsa.findPda(programId, [
    string({ size: 'variable' }).serialize('features'),
    string({ size: 'variable' }).serialize('max_supply'),
  ]);
}

export async function fetchMaxSupplyFeatureFromSeeds(
  context: Pick<Context, 'eddsa' | 'programs' | 'rpc'>,
  options?: RpcGetAccountOptions
): Promise<MaxSupplyFeature> {
  return fetchMaxSupplyFeature(
    context,
    findMaxSupplyFeaturePda(context),
    options
  );
}

export async function safeFetchMaxSupplyFeatureFromSeeds(
  context: Pick<Context, 'eddsa' | 'programs' | 'rpc'>,
  options?: RpcGetAccountOptions
): Promise<MaxSupplyFeature | null> {
  return safeFetchMaxSupplyFeature(
    context,
    findMaxSupplyFeaturePda(context),
    options
  );
}
