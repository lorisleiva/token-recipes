import test from 'ava';
import { findAdditionalOutputsFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_macros';

const unlockMacro = getUnlockFeatureMacro(
  findAdditionalOutputsFeaturePda,
  'additionalOutputs',
  'ADDO',
  'mintBurn2'
);

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 2, 'mintBurn1', 1, 2, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 2, 'mintBurn2', 0, 3);
test(unlockMacro, 1, 3, 'mintBurn2', 1, 3, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 1, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 3, 'mintBurn3', 1, 3, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintSkill1', 1, 2);
test(unlockMacro, 1, 2, 'mintSkill1', 1, 2, 'invalid-mint');
test(unlockMacro, 1, 0, 'mintSkill2', 1, 3);
test(unlockMacro, 1, 3, 'mintSkill2', 1, 3, 'max-level-reached');
