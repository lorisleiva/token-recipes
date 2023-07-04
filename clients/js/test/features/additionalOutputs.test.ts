import test from 'ava';
import { findAdditionalOutputsFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_features';

const unlockMacro = getUnlockFeatureMacro(
  findAdditionalOutputsFeaturePda,
  'additionalOutputs',
  'ADDO'
);

test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 0, 'mintSkill1', 1, 2);
test(unlockMacro, 1, 0, 'mintSkill2', 1, 3);
