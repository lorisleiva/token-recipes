import test from 'ava';
import { findWisdomFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_macros';

const unlockMacro = getUnlockFeatureMacro(
  findWisdomFeaturePda,
  'wisdom',
  'WISD',
  'mintBurn2'
);

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
