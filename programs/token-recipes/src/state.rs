use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::account_info::AccountInfo;
use solana_program::entrypoint::ProgramResult;
use solana_program::msg;
use solana_program::program_error::ProgramError;
use solana_program::pubkey::Pubkey;

use crate::error::TokenRecipesError;

#[derive(Clone, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    Recipe,
    Ingredient,
    DelegatedIngredient,
}

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

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        Recipe::deserialize(&mut bytes).map_err(|error| {
            msg!("Error: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct Ingredient {
    pub key: Key,
    pub mint: Pubkey,
    pub recipe: Pubkey,
}
// TODO: seeds helper.

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct DelegatedIngredient {
    pub key: Key,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub counter: u32,
}
// TODO: seeds helper.

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum RecipeStatus {
    Paused,
    Active,
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct IngredientInput {
    pub mint: Pubkey,
    pub amount: u64,
}

impl IngredientInput {
    pub const LEN: usize = 32 + 8;
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct IngredientOutput {
    pub mint: Pubkey,
    pub amount: u64,
    pub max_supply: u64,
}

impl IngredientOutput {
    pub const LEN: usize = 32 + 8 + 8;
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum IngredientType {
    Input,
    Output,
}
