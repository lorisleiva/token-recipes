use num_derive::FromPrimitive;
use solana_program::{
    decode_error::DecodeError,
    msg,
    program_error::{PrintProgramError, ProgramError},
};
use thiserror::Error;

#[derive(Error, Clone, Debug, Eq, PartialEq, FromPrimitive)]
pub enum TokenRecipesError {
    /// 0 - Error deserializing an account
    #[error("Error deserializing an account")]
    DeserializationError,
    /// 1 - Error serializing an account
    #[error("Error serializing an account")]
    SerializationError,
    /// 2 - Invalid program owner
    #[error("Invalid program owner. This likely mean the provided account does not exist")]
    InvalidProgramOwner,
    /// 3 - Invalid PDA derivation
    #[error("Invalid PDA derivation")]
    InvalidPda,
    /// 4 - Expected empty account
    #[error("Expected empty account")]
    ExpectedEmptyAccount,
    /// 5 - Expected signer account
    #[error("Expected signer account")]
    ExpectedSignerAccount,
    /// 6 - Expected writable account
    #[error("Expected writable account")]
    ExpectedWritableAccount,
    /// 7 - Account mismatch
    #[error("Account mismatch")]
    AccountMismatch,
    /// 8 - Invalid data size
    #[error("Invalid data size")]
    InvalidDataSize,
    /// 9 - Invalid account key
    #[error("Invalid account key")]
    InvalidAccountKey,
    /// 10 - Ingredient already added
    #[error("Ingredient already added")]
    IngredientAlreadyAdded,
    /// 11 - Missing ingredient
    #[error("Missing ingredient")]
    MissingIngredient,
    /// 12 - Invalid mint authority
    #[error("Invalid mint authority")]
    InvalidMintAuthority,
    /// 13 - Recipe is not active
    #[error("Recipe is not active")]
    RecipeIsNotActive,
    /// 14 - Numerical overflow
    #[error("Numerical overflow")]
    NumericalOverflow,
    /// 15 - Not enough tokens
    #[error("Not enough tokens")]
    NotEnoughTokens,
    /// 16 - Maximum supply reached
    #[error("Maximum supply reached")]
    MaximumSupplyReached,
    /// 17 - Recipe must be empty before it can be deleted
    #[error("Recipe must be empty before it can be deleted")]
    RecipeMustBeEmptyBeforeItCanBeDeleted,
    /// 18 - Cannot add an ingredient with zero amount
    #[error("Cannot add an ingredient with zero amount")]
    CannotAddIngredientWithZeroAmount,
    /// 19 - Invalid fees
    #[error("Invalid fees")]
    InvalidFees,
    /// 20 - Invalid additional outputs
    #[error("Invalid additional outputs")]
    InvalidAdditionalOutputs,
    /// 21 - Missing destination argument
    #[error("Missing destination argument")]
    MissingDestinationArgument,
    /// 22 - Missing max supply argument
    #[error("Missing max supply argument")]
    MissingMaxSupplyArgument,
}

impl PrintProgramError for TokenRecipesError {
    fn print<E>(&self) {
        msg!(&self.to_string());
    }
}

impl From<TokenRecipesError> for ProgramError {
    fn from(e: TokenRecipesError) -> Self {
        ProgramError::Custom(e as u32)
    }
}

impl<T> DecodeError<T> for TokenRecipesError {
    fn type_of() -> &'static str {
        "Token Recipes Error"
    }
}
