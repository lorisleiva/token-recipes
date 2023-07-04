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
test(unlockMacro, 1, 3, 'mintBurn1', 0, 4);
test(unlockMacro, 1, 4, 'mintBurn1', 1, 4, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 5, 'mintBurn2', 0, 6);
test(unlockMacro, 1, 6, 'mintBurn2', 1, 6, 'max-level-reached');
