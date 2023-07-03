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
  struct,
} from '@metaplex-foundation/umi/serializers';
import { Key, KeyArgs, getKeySerializer } from '../types';

export type SolPaymentFeature = Account<SolPaymentFeatureAccountData>;

export type SolPaymentFeatureAccountData = {
  key: Key;
  mintBurn1: PublicKey;
  mintBurn2: PublicKey;
  mintBurn3: PublicKey;
  mintBurn4: PublicKey;
  mintBurn5: PublicKey;
  mintBurn6: PublicKey;
  mintBurn7: PublicKey;
  mintBurn8: PublicKey;
  mintBurn9: PublicKey;
  mintSkill1: PublicKey;
  mintSkill2: PublicKey;
  mintSkill3: PublicKey;
  mintSkill4: PublicKey;
  mintSkill5: PublicKey;
};

export type SolPaymentFeatureAccountDataArgs = {
  key: KeyArgs;
  mintBurn1: PublicKey;
  mintBurn2: PublicKey;
  mintBurn3: PublicKey;
  mintBurn4: PublicKey;
  mintBurn5: PublicKey;
  mintBurn6: PublicKey;
  mintBurn7: PublicKey;
  mintBurn8: PublicKey;
  mintBurn9: PublicKey;
  mintSkill1: PublicKey;
  mintSkill2: PublicKey;
  mintSkill3: PublicKey;
  mintSkill4: PublicKey;
  mintSkill5: PublicKey;
};

/** @deprecated Use `getSolPaymentFeatureAccountDataSerializer()` without any argument instead. */
export function getSolPaymentFeatureAccountDataSerializer(
  _context: object
): Serializer<SolPaymentFeatureAccountDataArgs, SolPaymentFeatureAccountData>;
export function getSolPaymentFeatureAccountDataSerializer(): Serializer<
  SolPaymentFeatureAccountDataArgs,
  SolPaymentFeatureAccountData
>;
export function getSolPaymentFeatureAccountDataSerializer(
  _context: object = {}
): Serializer<SolPaymentFeatureAccountDataArgs, SolPaymentFeatureAccountData> {
  return struct<SolPaymentFeatureAccountData>(
    [
      ['key', getKeySerializer()],
      ['mintBurn1', publicKeySerializer()],
      ['mintBurn2', publicKeySerializer()],
      ['mintBurn3', publicKeySerializer()],
      ['mintBurn4', publicKeySerializer()],
      ['mintBurn5', publicKeySerializer()],
      ['mintBurn6', publicKeySerializer()],
      ['mintBurn7', publicKeySerializer()],
      ['mintBurn8', publicKeySerializer()],
      ['mintBurn9', publicKeySerializer()],
      ['mintSkill1', publicKeySerializer()],
      ['mintSkill2', publicKeySerializer()],
      ['mintSkill3', publicKeySerializer()],
      ['mintSkill4', publicKeySerializer()],
      ['mintSkill5', publicKeySerializer()],
    ],
    { description: 'SolPaymentFeatureAccountData' }
  ) as Serializer<
    SolPaymentFeatureAccountDataArgs,
    SolPaymentFeatureAccountData
  >;
}

/** @deprecated Use `deserializeSolPaymentFeature(rawAccount)` without any context instead. */
export function deserializeSolPaymentFeature(
  context: object,
  rawAccount: RpcAccount
): SolPaymentFeature;
export function deserializeSolPaymentFeature(
  rawAccount: RpcAccount
): SolPaymentFeature;
export function deserializeSolPaymentFeature(
  context: RpcAccount | object,
  rawAccount?: RpcAccount
): SolPaymentFeature {
  return deserializeAccount(
    rawAccount ?? (context as RpcAccount),
    getSolPaymentFeatureAccountDataSerializer()
  );
}

export async function fetchSolPaymentFeature(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<SolPaymentFeature> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  assertAccountExists(maybeAccount, 'SolPaymentFeature');
  return deserializeSolPaymentFeature(maybeAccount);
}

export async function safeFetchSolPaymentFeature(
  context: Pick<Context, 'rpc'>,
  publicKey: PublicKey | Pda,
  options?: RpcGetAccountOptions
): Promise<SolPaymentFeature | null> {
  const maybeAccount = await context.rpc.getAccount(
    toPublicKey(publicKey, false),
    options
  );
  return maybeAccount.exists
    ? deserializeSolPaymentFeature(maybeAccount)
    : null;
}

export async function fetchAllSolPaymentFeature(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<SolPaymentFeature[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts.map((maybeAccount) => {
    assertAccountExists(maybeAccount, 'SolPaymentFeature');
    return deserializeSolPaymentFeature(maybeAccount);
  });
}

export async function safeFetchAllSolPaymentFeature(
  context: Pick<Context, 'rpc'>,
  publicKeys: Array<PublicKey | Pda>,
  options?: RpcGetAccountsOptions
): Promise<SolPaymentFeature[]> {
  const maybeAccounts = await context.rpc.getAccounts(
    publicKeys.map((key) => toPublicKey(key, false)),
    options
  );
  return maybeAccounts
    .filter((maybeAccount) => maybeAccount.exists)
    .map((maybeAccount) =>
      deserializeSolPaymentFeature(maybeAccount as RpcAccount)
    );
}

export function getSolPaymentFeatureGpaBuilder(
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
      mintBurn2: PublicKey;
      mintBurn3: PublicKey;
      mintBurn4: PublicKey;
      mintBurn5: PublicKey;
      mintBurn6: PublicKey;
      mintBurn7: PublicKey;
      mintBurn8: PublicKey;
      mintBurn9: PublicKey;
      mintSkill1: PublicKey;
      mintSkill2: PublicKey;
      mintSkill3: PublicKey;
      mintSkill4: PublicKey;
      mintSkill5: PublicKey;
    }>({
      key: [0, getKeySerializer()],
      mintBurn1: [1, publicKeySerializer()],
      mintBurn2: [33, publicKeySerializer()],
      mintBurn3: [65, publicKeySerializer()],
      mintBurn4: [97, publicKeySerializer()],
      mintBurn5: [129, publicKeySerializer()],
      mintBurn6: [161, publicKeySerializer()],
      mintBurn7: [193, publicKeySerializer()],
      mintBurn8: [225, publicKeySerializer()],
      mintBurn9: [257, publicKeySerializer()],
      mintSkill1: [289, publicKeySerializer()],
      mintSkill2: [321, publicKeySerializer()],
      mintSkill3: [353, publicKeySerializer()],
      mintSkill4: [385, publicKeySerializer()],
      mintSkill5: [417, publicKeySerializer()],
    })
    .deserializeUsing<SolPaymentFeature>((account) =>
      deserializeSolPaymentFeature(account)
    );
}

export function getSolPaymentFeatureSize(): number {
  return 449;
}