/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import {
  Serializer,
  array,
  struct,
  u8,
} from '@metaplex-foundation/umi/serializers';

export type FeatureLevels = {
  fees: number;
  additionalOutputs: number;
  padding: Array<number>;
};

export type FeatureLevelsArgs = FeatureLevels;

/** @deprecated Use `getFeatureLevelsSerializer()` without any argument instead. */
export function getFeatureLevelsSerializer(
  _context: object
): Serializer<FeatureLevelsArgs, FeatureLevels>;
export function getFeatureLevelsSerializer(): Serializer<
  FeatureLevelsArgs,
  FeatureLevels
>;
export function getFeatureLevelsSerializer(
  _context: object = {}
): Serializer<FeatureLevelsArgs, FeatureLevels> {
  return struct<FeatureLevels>(
    [
      ['fees', u8()],
      ['additionalOutputs', u8()],
      ['padding', array(u8(), { size: 8 })],
    ],
    { description: 'FeatureLevels' }
  ) as Serializer<FeatureLevelsArgs, FeatureLevels>;
}
