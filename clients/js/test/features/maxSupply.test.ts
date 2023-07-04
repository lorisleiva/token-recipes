import test from 'ava';
import { getUnlockFeatureMacro } from '../_macros';

const unlockMacro = getUnlockFeatureMacro('maxSupply');

// fromTokens, fromLevel, mint, toTokens, toLevel, error?
test(unlockMacro, 1, 0, 'mintBurn1', 0, 1);
test(unlockMacro, 1, 1, 'mintBurn1', 1, 1, 'max-level-reached');
test(unlockMacro, 1, 0, 'mintSkill1', 1, 1);
test(unlockMacro, 1, 1, 'mintSkill1', 1, 1, 'max-level-reached');
