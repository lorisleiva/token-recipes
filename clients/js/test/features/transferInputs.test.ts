import test from 'ava';
import { findTransferInputsFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_features';

const unlockMacro = getUnlockFeatureMacro(
  findTransferInputsFeaturePda,
  'transferInputs',
  'TRIN'
);

test(unlockMacro, 1, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 'mintBurn3', 0, 3);
test(unlockMacro, 1, 'mintSkill1', 1, 2);
test(unlockMacro, 1, 'mintSkill2', 1, 3);
