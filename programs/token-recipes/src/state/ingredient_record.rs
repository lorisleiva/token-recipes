use crate::{error::TokenRecipesError, state::key::Key};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct IngredientRecord {
    pub key: Key,
    pub input: bool,
    pub output: bool,
    pub mint: Pubkey,
    pub recipe: Pubkey,
}

impl IngredientRecord {
    pub const LEN: usize = 1 + 1 + 1 + 32 + 32;

    pub fn set_input(&mut self, value: bool) -> ProgramResult {
        match (self.input == value, value) {
            (true, true) => {
                msg!(
                    "Ingredient [{}] is already part of this recipe as an input.",
                    self.mint
                );
                Err(TokenRecipesError::IngredientAlreadyAdded.into())
            }
            (true, false) => {
                msg!(
                    "Ingredient [{}] is not part of this recipe as an input.",
                    self.mint,
                );
                Err(TokenRecipesError::MissingIngredient.into())
            }
            _ => {
                self.input = value;
                Ok(())
            }
        }
    }

    pub fn set_output(&mut self, value: bool) -> ProgramResult {
        match (self.output == value, value) {
            (true, true) => {
                msg!(
                    "Ingredient [{}] is already part of this recipe as an output.",
                    self.mint
                );
                Err(TokenRecipesError::IngredientAlreadyAdded.into())
            }
            (true, false) => {
                msg!(
                    "Ingredient [{}] is not part of this recipe as an output.",
                    self.mint,
                );
                Err(TokenRecipesError::MissingIngredient.into())
            }
            _ => {
                self.output = value;
                Ok(())
            }
        }
    }

    pub fn should_be_closed(&mut self) -> bool {
        !self.input && !self.output
    }

    pub fn seeds<'a>(mint: &'a Pubkey, recipe: &'a Pubkey) -> Vec<&'a [u8]> {
        vec![
            "ingredient_record".as_bytes(),
            mint.as_ref(),
            recipe.as_ref(),
        ]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        IngredientRecord::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing Recipe account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing Recipe account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}
