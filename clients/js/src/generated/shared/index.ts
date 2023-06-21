/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  AccountMeta,
  isSigner,
  Pda,
  publicKey,
  PublicKey,
  Signer,
} from '@metaplex-foundation/umi';

/**
 * Transforms the given object such that the given keys are optional.
 * @internal
 */
export type PickPartial<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Defines an instruction account that keeps track of whether it is writable or not.
 * @internal
 */
export type WithWritable<T extends PublicKey | Pda | Signer | undefined> =
  readonly [T, boolean];

/**
 * Helper function that dynamically updates the type of
 * an object as we add more properties to the object.
 * @internal
 */
export function addObjectProperty<T extends object, U extends string, V>(
  obj: T,
  key: U,
  value: V
): asserts obj is T & { [K in U]: V } {
  (obj as any)[key] = value;
}

/**
 * Adds an instruction account to the given list of keys and signers.
 * @internal
 */
export function addAccountMeta(
  keys: AccountMeta[],
  signers: Signer[],
  account: WithWritable<PublicKey | Pda | Signer>,
  isOptional: false
): void;
export function addAccountMeta(
  keys: AccountMeta[],
  signers: Signer[],
  account: WithWritable<PublicKey | Pda | Signer | undefined>,
  isOptional: true
): void;
export function addAccountMeta(
  keys: AccountMeta[],
  signers: Signer[],
  account: WithWritable<PublicKey | Pda | Signer | undefined>,
  isOptional: boolean
): void {
  if (isOptional && !account[0]) {
    return;
  }
  if (!account[0]) {
    throw new Error('Expected instruction account to be defined');
  }
  if (isSigner(account[0])) {
    signers.push(account[0]);
  }
  keys.push({
    pubkey: publicKey(account[0], false),
    isSigner: isSigner(account[0]),
    isWritable: account[1],
  });
}
