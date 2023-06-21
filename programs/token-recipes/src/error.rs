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
    /// 2 - Invalid instruction account
    #[error("Invalid instruction account")]
    InvalidInstructionAccount,
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
