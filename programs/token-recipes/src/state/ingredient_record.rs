use crate::{
    assertions::{
        assert_account_key, assert_empty, assert_pda, assert_program_owner, assert_same_pubkeys,
        assert_writable,
    },
    error::TokenRecipesError,
    state::key::Key,
    utils::{close_account, create_account},
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

    pub fn create(
        ingredient_record: &AccountInfo,
        mint: &AccountInfo,
        recipe: &AccountInfo,
        payer: &AccountInfo,
        system_program: &AccountInfo,
    ) -> Result<Self, ProgramError> {
        assert_empty("ingredient_record", ingredient_record)?;
        assert_writable("ingredient_record", ingredient_record)?;
        let ingredient_record_bump = assert_pda(
            "ingredient_record",
            ingredient_record,
            &crate::id(),
            &Self::seeds(mint.key, recipe.key),
        )?;

        let mut seeds = Self::seeds(mint.key, recipe.key);
        let bump = [ingredient_record_bump];
        seeds.push(&bump);
        create_account(
            ingredient_record,
            payer,
            system_program,
            Self::LEN,
            &crate::id(),
            Some(&[&seeds]),
        )?;
        Ok(Self {
            key: Key::IngredientRecord,
            input: false,
            output: false,
            mint: *mint.key,
            recipe: *recipe.key,
        })
    }

    pub fn get(
        ingredient_record: &AccountInfo,
        mint: &AccountInfo,
        recipe: &AccountInfo,
    ) -> Result<Self, ProgramError> {
        assert_writable("ingredient_record", ingredient_record)?;
        assert_program_owner("ingredient_record", ingredient_record, &crate::id())?;
        assert_account_key(
            "ingredient_record",
            ingredient_record,
            Key::IngredientRecord,
        )?;
        assert_pda(
            "ingredient_record",
            ingredient_record,
            &crate::id(),
            &Self::seeds(mint.key, recipe.key),
        )?;
        let mut ingredient_record_account = Self::load(ingredient_record)?;
        assert_same_pubkeys("recipe", recipe, &ingredient_record_account.recipe)?;
        assert_same_pubkeys("mint", mint, &ingredient_record_account.mint)?;
        Ok(ingredient_record_account)
    }

    pub fn get_or_create(
        ingredient_record: &AccountInfo,
        mint: &AccountInfo,
        recipe: &AccountInfo,
        payer: &AccountInfo,
        system_program: &AccountInfo,
    ) -> Result<Self, ProgramError> {
        match ingredient_record.data_is_empty() {
            true => Self::create(ingredient_record, mint, recipe, payer, system_program),
            false => Self::get(ingredient_record, mint, recipe),
        }
    }

    pub fn save_or_close(
        &mut self,
        ingredient_record: &AccountInfo,
        payer: &AccountInfo,
    ) -> ProgramResult {
        match self.should_be_closed() {
            true => close_account(ingredient_record, payer),
            false => self.save(ingredient_record),
        }
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        Self::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing IngredientRecord account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing IngredientRecord account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}
