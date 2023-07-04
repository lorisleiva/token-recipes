import test from 'ava';
import { findWisdomFeaturePda } from '../../src';
import { getUnlockFeatureMacro } from '../_features';

const unlockMacro = getUnlockFeatureMacro(
  findWisdomFeaturePda,
  'wisdom',
  'WISD'
);

test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 0, 'mintBurn2', 0, 1);
