use crate::{
    error::TokenRecipesError,
    state::{key::Key, recipe::Recipe},
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct AdditionalOutputsFeature {
    /// Account discriminator.
    pub key: Key,
    /// When burned, allows leveling up by 1 from 0 to 2.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 2 to 3.
    pub mint_burn_2: Pubkey,
    /// When burned, allows leveling up straight to 3.
    pub mint_burn_3: Pubkey,
    /// Without burning, allows leveling up straight to 2.
    pub mint_skill_1: Pubkey,
    /// Without burning, allows leveling up straight to 3.
    pub mint_skill_2: Pubkey,
}

impl AdditionalOutputsFeature {
    pub const LEN: usize = 1 + 32 * 5;

    pub fn seeds<'a>() -> Vec<&'a [u8]> {
        vec!["features".as_bytes(), "additional_outputs".as_bytes()]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        AdditionalOutputsFeature::deserialize(&mut bytes).map_err(|error| {
            msg!(
                "Error deserializing AdditionalOutputsFeature account: {}",
                error
            );
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!(
                "Error serializing AdditionalOutputsFeature account: {}",
                error
            );
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

/// Asserts that the recipe has a valid number of additional outputs.
/// Make sure to use AFTER the recipe was updated.
pub fn assert_valid_additional_outputs(recipe: &Recipe) -> ProgramResult {
    let total_outputs = recipe.outputs.len();
    match recipe.feature_levels.additional_outputs {
        0 => assert_max_outputs(total_outputs, 1),
        1 => assert_max_outputs(total_outputs, 2),
        2 => assert_max_outputs(total_outputs, 3),
        _ => Ok(()),
    }
}

pub fn assert_max_outputs(total_outputs: usize, max_allowed: usize) -> ProgramResult {
    if total_outputs > max_allowed {
        msg!(
            "You cannot have more than {} outputs for this recipe. Level up the \"Additional Outputs\" feature to increase the limit.",
            max_allowed
        );
        Err(TokenRecipesError::InvalidAdditionalOutputs.into())
    } else {
        Ok(())
    }
}
