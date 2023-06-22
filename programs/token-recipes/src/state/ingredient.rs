use crate::{
    error::TokenRecipesError,
    state::{key::Key, recipe::IngredientType},
};
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
    pub ingredient_type: IngredientType,
    pub mint: Pubkey,
    pub recipe: Pubkey,
}

impl IngredientRecord {
    pub const LEN: usize = 1 + 32 + 32;

    pub fn seeds<'a>(mint: &'a Pubkey, recipe: &'a Pubkey) -> [&'a [u8]; 3] {
        ["ingredient".as_bytes(), mint.as_ref(), recipe.as_ref()]
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
