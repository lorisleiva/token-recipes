use crate::{error::TokenRecipesError, state::key::Key};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct Recipe {
    pub key: Key,
    pub authority: Pubkey,
    pub status: RecipeStatus,
    pub inputs: Vec<IngredientInput>,
    pub outputs: Vec<IngredientOutput>,
}

impl Recipe {
    pub const INITIAL_LEN: usize = 1 + 32 + 1 + 4 + 4;

    pub fn add_ingredient_input(&mut self, ingredient: IngredientInput) {
        self.inputs.push(ingredient);
    }

    pub fn add_ingredient_output(&mut self, ingredient: IngredientOutput) {
        self.outputs.push(ingredient);
    }

    pub fn remove_ingredient_input(
        &mut self,
        mint: &Pubkey,
    ) -> Result<IngredientInput, ProgramError> {
        match self.inputs.iter().position(|i| i.mint == *mint) {
            Some(index) => {
                let ingredient = self.inputs[index].clone();
                self.inputs.remove(index);
                Ok(ingredient)
            }
            None => {
                msg!(
                    "Ingredient [{}] is not part of this recipe as an input.",
                    mint,
                );
                Err(TokenRecipesError::MissingIngredient.into())
            }
        }
    }

    pub fn remove_ingredient_output(
        &mut self,
        mint: &Pubkey,
    ) -> Result<IngredientOutput, ProgramError> {
        match self.outputs.iter().position(|i| i.mint == *mint) {
            Some(index) => {
                let ingredient = self.outputs[index].clone();
                self.outputs.remove(index);
                Ok(ingredient)
            }
            None => {
                msg!(
                    "Ingredient [{}] is not part of this recipe as an output.",
                    mint,
                );
                Err(TokenRecipesError::MissingIngredient.into())
            }
        }
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        Recipe::deserialize(&mut bytes).map_err(|error| {
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

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum RecipeStatus {
    Paused,
    Active,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum IngredientType {
    Input,
    Output,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct IngredientInput {
    pub mint: Pubkey,
    pub amount: u64,
    pub destination: Option<Pubkey>,
}

impl IngredientInput {
    pub fn len(&self) -> usize {
        32 + 8 + self.destination.map(|_| 33).unwrap_or(1)
    }
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct IngredientOutput {
    pub mint: Pubkey,
    pub amount: u64,
    pub max_supply: u64,
}

impl IngredientOutput {
    pub fn len(&self) -> usize {
        32 + 8 + 8
    }
}
