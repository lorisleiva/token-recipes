use crate::{
    assertions::{
        assert_account_key, assert_program_owner, assert_same_pubkeys, assert_signer,
        assert_writable,
    },
    error::TokenRecipesError,
    state::{
        features::FeatureLevels, ingredient_input::IngredientInput,
        ingredient_output::IngredientOutput, key::Key,
    },
    utils::realloc_account,
};
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
    pub base: Pubkey,
    pub authority: Pubkey,
    pub status: RecipeStatus,
    pub total_crafts: u64,
    pub total_crafts_with_quantity: u64,
    pub fees: u64,
    pub accumulated_admin_fees: u64,
    pub accumulated_shards: u64,
    pub accumulated_experience: u64,
    pub feature_levels: FeatureLevels,
    pub inputs: Vec<IngredientInput>,
    pub outputs: Vec<IngredientOutput>,
}

impl Recipe {
    pub const INITIAL_LEN: usize = Key::LEN // key
        + 32 // base
        + 32 // authority
        + RecipeStatus::LEN // status
        + 8 // total_crafts
        + 8 // total_crafts_with_quantity 
        + 8 // fees
        + 8 // accumulated_admin_fees
        + 8 // accumulated_shards
        + 8 // accumulated_experience
        + FeatureLevels::LEN // feature_levels
        + 4 // inputs.len()
        + 4; // outputs.len()

    pub fn get(recipe: &AccountInfo) -> Result<Self, ProgramError> {
        assert_program_owner("recipe", recipe, &crate::id())?;
        assert_account_key("recipe", recipe, Key::Recipe)?;
        Recipe::load(recipe)
    }

    pub fn get_writable(recipe: &AccountInfo) -> Result<Self, ProgramError> {
        assert_writable("recipe", recipe)?;
        Self::get(recipe)
    }

    pub fn assert_authority(&self, authority: &AccountInfo) -> ProgramResult {
        assert_same_pubkeys("authority", authority, &self.authority)
    }

    pub fn assert_signer_authority(&self, authority: &AccountInfo) -> ProgramResult {
        self.assert_authority(authority)?;
        assert_signer("authority", authority)
    }

    pub fn assert_active(&self) -> ProgramResult {
        if !matches!(self.status, RecipeStatus::Active) {
            Err(TokenRecipesError::RecipeIsNotActive.into())
        } else {
            Ok(())
        }
    }

    pub fn find_ingredient(
        &self,
        ingredient_type: IngredientType,
        mint: &AccountInfo,
    ) -> Result<(Ingredient, usize), ProgramError> {
        match ingredient_type {
            IngredientType::BurnTokenInput | IngredientType::TransferTokenInput => {
                let maybe_index = self.inputs.iter().position(|i| match i {
                    IngredientInput::BurnToken { mint: m, .. }
                    | IngredientInput::TransferToken { mint: m, .. } => m == mint.key,
                    _ => false,
                });
                match maybe_index {
                    Some(index) => Ok((Ingredient::Input(self.inputs[index].clone()), index)),
                    None => {
                        msg!(
                            "Ingredient [{}] is not part of this recipe as an input.",
                            mint.key
                        );
                        Err(TokenRecipesError::MissingIngredient.into())
                    }
                }
            }
            IngredientType::TransferSolInput => {
                let maybe_index = self.inputs.iter().position(|i| match i {
                    IngredientInput::TransferSol { .. } => true,
                    _ => false,
                });
                match maybe_index {
                    Some(index) => Ok((Ingredient::Input(self.inputs[index].clone()), index)),
                    None => {
                        msg!(
                            "Ingredient [{}] is not part of this recipe as an input.",
                            mint.key
                        );
                        Err(TokenRecipesError::MissingIngredient.into())
                    }
                }
            }
            IngredientType::MintTokenOutput | IngredientType::MintTokenWithMaxSupplyOutput => {
                let maybe_index = self.outputs.iter().position(|i| match i {
                    IngredientOutput::MintToken { mint: m, .. }
                    | IngredientOutput::MintTokenWithMaxSupply { mint: m, .. } => m == mint.key,
                });
                match maybe_index {
                    Some(index) => Ok((Ingredient::Output(self.outputs[index].clone()), index)),
                    None => {
                        msg!(
                            "Ingredient [{}] is not part of this recipe as an output.",
                            mint.key
                        );
                        Err(TokenRecipesError::MissingIngredient.into())
                    }
                }
            }
        }
    }

    pub fn add_ingredient_input<'a>(
        &mut self,
        ingredient: &IngredientInput,
        recipe: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        self.inputs.push(ingredient.clone());
        let new_size = recipe.data_len() + ingredient.len();
        realloc_account(recipe, payer, system_program, new_size, true)?;
        self.save(recipe)
    }

    pub fn add_ingredient_output<'a>(
        &mut self,
        ingredient: &IngredientOutput,
        recipe: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        self.outputs.push(ingredient.clone());
        let new_size = recipe.data_len() + ingredient.len();
        realloc_account(recipe, payer, system_program, new_size, true)?;
        self.save(recipe)
    }

    pub fn remove_ingredient_input<'a>(
        &mut self,
        index: usize,
        recipe: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> Result<IngredientInput, ProgramError> {
        match self.inputs.get(index) {
            Some(ingredient) => {
                let ingredient = ingredient.clone();
                self.inputs.remove(index);
                let new_size = recipe.data_len() - ingredient.len();
                realloc_account(recipe, payer, system_program, new_size, true)?;
                self.save(recipe)?;
                Ok(ingredient)
            }
            None => {
                msg!(
                    "Ingredient #{} is not part of this recipe as an input.",
                    index,
                );
                Err(TokenRecipesError::MissingIngredient.into())
            }
        }
    }

    pub fn remove_ingredient_output<'a>(
        &mut self,
        index: usize,
        recipe: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> Result<IngredientOutput, ProgramError> {
        match self.outputs.get(index) {
            Some(ingredient) => {
                let ingredient = ingredient.clone();
                self.outputs.remove(index);
                let new_size = recipe.data_len() - ingredient.len();
                realloc_account(recipe, payer, system_program, new_size, true)?;
                self.save(recipe)?;
                Ok(ingredient)
            }
            None => {
                msg!(
                    "Ingredient #{} is not part of this recipe as an output.",
                    index,
                );
                Err(TokenRecipesError::MissingIngredient.into())
            }
        }
    }

    pub fn seeds(base: &Pubkey) -> Vec<&[u8]> {
        vec!["recipe".as_bytes(), base.as_ref()]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        Self::deserialize(&mut bytes).map_err(|error| {
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

impl RecipeStatus {
    const LEN: usize = 1;
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum IngredientType {
    BurnTokenInput,
    TransferTokenInput,
    MintTokenOutput,
    MintTokenWithMaxSupplyOutput,
    TransferSolInput,
}

pub enum Ingredient {
    Input(IngredientInput),
    Output(IngredientOutput),
}
