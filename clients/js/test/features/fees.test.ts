import test from 'ava';
import { findFeesFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_features';

const unlockMacro = getUnlockFeatureMacro(findFeesFeaturePda, 'fees', 'FEES');

test(unlockMacro, 1, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 'mintBurn2', 0, 1);
test(unlockMacro, 1, 'mintBurn3', 0, 1);
test(unlockMacro, 1, 'mintBurn4', 0, 10);
test(unlockMacro, 1, 'mintBurn5', 0, 11);
test(unlockMacro, 1, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 'mintSkill2', 1, 10);
test(unlockMacro, 1, 'mintSkill3', 1, 11);
