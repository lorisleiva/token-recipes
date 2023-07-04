import test from 'ava';
import { findFeesFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_macros';

const unlockMacro = getUnlockFeatureMacro(
  findFeesFeaturePda,
  'fees',
  'FEES',
  'mintBurn3'
);

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn3', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn4', 0, 10);
test(unlockMacro, 1, 0, 'mintBurn5', 0, 11);
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 0, 'mintSkill2', 1, 10);
test(unlockMacro, 1, 0, 'mintSkill3', 1, 11);
