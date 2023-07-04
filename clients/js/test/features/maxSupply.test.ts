import test from 'ava';
import { findMaxSupplyFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_features';

const unlockMacro = getUnlockFeatureMacro(
  findMaxSupplyFeaturePda,
  'maxSupply',
  'MAXS'
);

test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
