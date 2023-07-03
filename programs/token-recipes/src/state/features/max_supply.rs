use crate::{
    error::TokenRecipesError,
    state::{ingredient_output::IngredientOutput, key::Key, recipe::Recipe},
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

/// Unlocks max supply outputs.
///
/// - Level 0: No max supply outputs allowed.
/// - Level 1: Unlimited max supply outputs allowed.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct MaxSupplyFeature {
    /// Account discriminator.
    pub key: Key,
    /// When burned, allows leveling up by 1 from 0 to 1.
    pub mint_burn_1: Pubkey,
    /// Without burning, allows leveling up straight to 1.
    pub mint_skill_1: Pubkey,
}

impl MaxSupplyFeature {
    pub const LEN: usize = 1 + 32 * 2;

    pub fn seeds<'a>() -> Vec<&'a [u8]> {
        vec!["features".as_bytes(), "max_supply".as_bytes()]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        MaxSupplyFeature::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing MaxSupplyFeature account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing MaxSupplyFeature account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

/// Asserts that the recipe has a valid number of transfer inputs.
/// Make sure to use AFTER the recipe was updated.
pub fn assert_valid_max_supply(recipe: &Recipe) -> ProgramResult {
    let total_max_supply_outputs = recipe
        .outputs
        .iter()
        .filter(|i| matches!(i, IngredientOutput::MintTokenWithMaxSupply { .. }))
        .count();

    match recipe.feature_levels.max_supply {
        0 => assert_max_max_supply(total_max_supply_outputs, 0),
        _ => Ok(()),
    }
}

pub fn assert_max_max_supply(total_max_supply_outputs: usize, max_allowed: usize) -> ProgramResult {
    if total_max_supply_outputs > max_allowed {
        msg!(
            "You cannot have more than {} max supply outputs for this recipe. Level up the \"Max Supply\" feature to increase the limit.",
            max_allowed
        );
        Err(TokenRecipesError::InvalidMaxSupply.into())
    } else {
        Ok(())
    }
}
