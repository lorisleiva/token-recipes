/**
 * This code was AUTOGENERATED using the kinobi library.
 * Please DO NOT EDIT THIS FILE, instead use visitors
 * to add features, then rerun kinobi to update it.
 *
 * @see https://github.com/metaplex-foundation/kinobi
 */

import { Program, ProgramError } from '@metaplex-foundation/umi';

type ProgramErrorConstructor = new (
  program: Program,
  cause?: Error
) => ProgramError;
const codeToErrorMap: Map<number, ProgramErrorConstructor> = new Map();
const nameToErrorMap: Map<string, ProgramErrorConstructor> = new Map();

/** DeserializationError: Error deserializing an account */
export class DeserializationErrorError extends ProgramError {
  readonly name: string = 'DeserializationError';

  readonly code: number = 0x0; // 0

  constructor(program: Program, cause?: Error) {
    super('Error deserializing an account', program, cause);
  }
}
codeToErrorMap.set(0x0, DeserializationErrorError);
nameToErrorMap.set('DeserializationError', DeserializationErrorError);

/** SerializationError: Error serializing an account */
export class SerializationErrorError extends ProgramError {
  readonly name: string = 'SerializationError';

  readonly code: number = 0x1; // 1

  constructor(program: Program, cause?: Error) {
    super('Error serializing an account', program, cause);
  }
}
codeToErrorMap.set(0x1, SerializationErrorError);
nameToErrorMap.set('SerializationError', SerializationErrorError);

/** InvalidProgramOwner: Invalid program owner. This likely mean the provided account does not exist */
export class InvalidProgramOwnerError extends ProgramError {
  readonly name: string = 'InvalidProgramOwner';

  readonly code: number = 0x2; // 2

  constructor(program: Program, cause?: Error) {
    super(
      'Invalid program owner. This likely mean the provided account does not exist',
      program,
      cause
    );
  }
}
codeToErrorMap.set(0x2, InvalidProgramOwnerError);
nameToErrorMap.set('InvalidProgramOwner', InvalidProgramOwnerError);

/** InvalidPda: Invalid PDA derivation */
export class InvalidPdaError extends ProgramError {
  readonly name: string = 'InvalidPda';

  readonly code: number = 0x3; // 3

  constructor(program: Program, cause?: Error) {
    super('Invalid PDA derivation', program, cause);
  }
}
codeToErrorMap.set(0x3, InvalidPdaError);
nameToErrorMap.set('InvalidPda', InvalidPdaError);

/** ExpectedEmptyAccount: Expected empty account */
export class ExpectedEmptyAccountError extends ProgramError {
  readonly name: string = 'ExpectedEmptyAccount';

  readonly code: number = 0x4; // 4

  constructor(program: Program, cause?: Error) {
    super('Expected empty account', program, cause);
  }
}
codeToErrorMap.set(0x4, ExpectedEmptyAccountError);
nameToErrorMap.set('ExpectedEmptyAccount', ExpectedEmptyAccountError);

/** ExpectedSignerAccount: Expected signer account */
export class ExpectedSignerAccountError extends ProgramError {
  readonly name: string = 'ExpectedSignerAccount';

  readonly code: number = 0x5; // 5

  constructor(program: Program, cause?: Error) {
    super('Expected signer account', program, cause);
  }
}
codeToErrorMap.set(0x5, ExpectedSignerAccountError);
nameToErrorMap.set('ExpectedSignerAccount', ExpectedSignerAccountError);

/** ExpectedWritableAccount: Expected writable account */
export class ExpectedWritableAccountError extends ProgramError {
  readonly name: string = 'ExpectedWritableAccount';

  readonly code: number = 0x6; // 6

  constructor(program: Program, cause?: Error) {
    super('Expected writable account', program, cause);
  }
}
codeToErrorMap.set(0x6, ExpectedWritableAccountError);
nameToErrorMap.set('ExpectedWritableAccount', ExpectedWritableAccountError);

/** AccountMismatch: Account mismatch */
export class AccountMismatchError extends ProgramError {
  readonly name: string = 'AccountMismatch';

  readonly code: number = 0x7; // 7

  constructor(program: Program, cause?: Error) {
    super('Account mismatch', program, cause);
  }
}
codeToErrorMap.set(0x7, AccountMismatchError);
nameToErrorMap.set('AccountMismatch', AccountMismatchError);

/** InvalidDataSize: Invalid data size */
export class InvalidDataSizeError extends ProgramError {
  readonly name: string = 'InvalidDataSize';

  readonly code: number = 0x8; // 8

  constructor(program: Program, cause?: Error) {
    super('Invalid data size', program, cause);
  }
}
codeToErrorMap.set(0x8, InvalidDataSizeError);
nameToErrorMap.set('InvalidDataSize', InvalidDataSizeError);

/** InvalidAccountKey: Invalid account key */
export class InvalidAccountKeyError extends ProgramError {
  readonly name: string = 'InvalidAccountKey';

  readonly code: number = 0x9; // 9

  constructor(program: Program, cause?: Error) {
    super('Invalid account key', program, cause);
  }
}
codeToErrorMap.set(0x9, InvalidAccountKeyError);
nameToErrorMap.set('InvalidAccountKey', InvalidAccountKeyError);

/** IngredientAlreadyAdded: Ingredient already added */
export class IngredientAlreadyAddedError extends ProgramError {
  readonly name: string = 'IngredientAlreadyAdded';

  readonly code: number = 0xa; // 10

  constructor(program: Program, cause?: Error) {
    super('Ingredient already added', program, cause);
  }
}
codeToErrorMap.set(0xa, IngredientAlreadyAddedError);
nameToErrorMap.set('IngredientAlreadyAdded', IngredientAlreadyAddedError);

/** MissingIngredient: Missing ingredient */
export class MissingIngredientError extends ProgramError {
  readonly name: string = 'MissingIngredient';

  readonly code: number = 0xb; // 11

  constructor(program: Program, cause?: Error) {
    super('Missing ingredient', program, cause);
  }
}
codeToErrorMap.set(0xb, MissingIngredientError);
nameToErrorMap.set('MissingIngredient', MissingIngredientError);

/** InvalidMintAuthority: Invalid mint authority */
export class InvalidMintAuthorityError extends ProgramError {
  readonly name: string = 'InvalidMintAuthority';

  readonly code: number = 0xc; // 12

  constructor(program: Program, cause?: Error) {
    super('Invalid mint authority', program, cause);
  }
}
codeToErrorMap.set(0xc, InvalidMintAuthorityError);
nameToErrorMap.set('InvalidMintAuthority', InvalidMintAuthorityError);

/** RecipeIsNotActive: Recipe is not active */
export class RecipeIsNotActiveError extends ProgramError {
  readonly name: string = 'RecipeIsNotActive';

  readonly code: number = 0xd; // 13

  constructor(program: Program, cause?: Error) {
    super('Recipe is not active', program, cause);
  }
}
codeToErrorMap.set(0xd, RecipeIsNotActiveError);
nameToErrorMap.set('RecipeIsNotActive', RecipeIsNotActiveError);

/** NumericalOverflow: Numerical overflow */
export class NumericalOverflowError extends ProgramError {
  readonly name: string = 'NumericalOverflow';

  readonly code: number = 0xe; // 14

  constructor(program: Program, cause?: Error) {
    super('Numerical overflow', program, cause);
  }
}
codeToErrorMap.set(0xe, NumericalOverflowError);
nameToErrorMap.set('NumericalOverflow', NumericalOverflowError);

/** NotEnoughTokens: Not enough tokens */
export class NotEnoughTokensError extends ProgramError {
  readonly name: string = 'NotEnoughTokens';

  readonly code: number = 0xf; // 15

  constructor(program: Program, cause?: Error) {
    super('Not enough tokens', program, cause);
  }
}
codeToErrorMap.set(0xf, NotEnoughTokensError);
nameToErrorMap.set('NotEnoughTokens', NotEnoughTokensError);

/** MaximumSupplyReached: Maximum supply reached */
export class MaximumSupplyReachedError extends ProgramError {
  readonly name: string = 'MaximumSupplyReached';

  readonly code: number = 0x10; // 16

  constructor(program: Program, cause?: Error) {
    super('Maximum supply reached', program, cause);
  }
}
codeToErrorMap.set(0x10, MaximumSupplyReachedError);
nameToErrorMap.set('MaximumSupplyReached', MaximumSupplyReachedError);

/** RecipeMustBeEmptyBeforeItCanBeDeleted: Recipe must be empty before it can be deleted */
export class RecipeMustBeEmptyBeforeItCanBeDeletedError extends ProgramError {
  readonly name: string = 'RecipeMustBeEmptyBeforeItCanBeDeleted';

  readonly code: number = 0x11; // 17

  constructor(program: Program, cause?: Error) {
    super('Recipe must be empty before it can be deleted', program, cause);
  }
}
codeToErrorMap.set(0x11, RecipeMustBeEmptyBeforeItCanBeDeletedError);
nameToErrorMap.set(
  'RecipeMustBeEmptyBeforeItCanBeDeleted',
  RecipeMustBeEmptyBeforeItCanBeDeletedError
);

/**
 * Attempts to resolve a custom program error from the provided error code.
 * @category Errors
 */
export function getTokenRecipesErrorFromCode(
  code: number,
  program: Program,
  cause?: Error
): ProgramError | null {
  const constructor = codeToErrorMap.get(code);
  return constructor ? new constructor(program, cause) : null;
}

/**
 * Attempts to resolve a custom program error from the provided error name, i.e. 'Unauthorized'.
 * @category Errors
 */
export function getTokenRecipesErrorFromName(
  name: string,
  program: Program,
  cause?: Error
): ProgramError | null {
  const constructor = nameToErrorMap.get(name);
  return constructor ? new constructor(program, cause) : null;
}
