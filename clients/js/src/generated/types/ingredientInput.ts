/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { PublicKey } from '@metaplex-foundation/umi';
import {
  GetDataEnumKind,
  GetDataEnumKindContent,
  Serializer,
  dataEnum,
  publicKey as publicKeySerializer,
  struct,
  u64,
} from '@metaplex-foundation/umi/serializers';

export type IngredientInput =
  | { __kind: 'BurnToken'; mint: PublicKey; amount: bigint }
  | {
      __kind: 'TransferToken';
      mint: PublicKey;
      amount: bigint;
      destination: PublicKey;
    };

export type IngredientInputArgs =
  | { __kind: 'BurnToken'; mint: PublicKey; amount: number | bigint }
  | {
      __kind: 'TransferToken';
      mint: PublicKey;
      amount: number | bigint;
      destination: PublicKey;
    };

/** @deprecated Use `getIngredientInputSerializer()` without any argument instead. */
export function getIngredientInputSerializer(
  _context: object
): Serializer<IngredientInputArgs, IngredientInput>;
export function getIngredientInputSerializer(): Serializer<
  IngredientInputArgs,
  IngredientInput
>;
export function getIngredientInputSerializer(
  _context: object = {}
): Serializer<IngredientInputArgs, IngredientInput> {
  return dataEnum<IngredientInput>(
    [
      [
        'BurnToken',
        struct<GetDataEnumKindContent<IngredientInput, 'BurnToken'>>([
          ['mint', publicKeySerializer()],
          ['amount', u64()],
        ]),
      ],
      [
        'TransferToken',
        struct<GetDataEnumKindContent<IngredientInput, 'TransferToken'>>([
          ['mint', publicKeySerializer()],
          ['amount', u64()],
          ['destination', publicKeySerializer()],
        ]),
      ],
    ],
    { description: 'IngredientInput' }
  ) as Serializer<IngredientInputArgs, IngredientInput>;
}

// Data Enum Helpers.
export function ingredientInput(
  kind: 'BurnToken',
  data: GetDataEnumKindContent<IngredientInputArgs, 'BurnToken'>
): GetDataEnumKind<IngredientInputArgs, 'BurnToken'>;
export function ingredientInput(
  kind: 'TransferToken',
  data: GetDataEnumKindContent<IngredientInputArgs, 'TransferToken'>
): GetDataEnumKind<IngredientInputArgs, 'TransferToken'>;
export function ingredientInput<K extends IngredientInputArgs['__kind']>(
  kind: K,
  data?: any
): Extract<IngredientInputArgs, { __kind: K }> {
  return Array.isArray(data)
    ? { __kind: kind, fields: data }
    : { __kind: kind, ...(data ?? {}) };
}
export function isIngredientInput<K extends IngredientInput['__kind']>(
  kind: K,
  value: IngredientInput
): value is IngredientInput & { __kind: K } {
  return value.__kind === kind;
}
