use crate::{
    assertions::assert_mint_account,
    error::TokenRecipesError,
    state::{features::UnlockFeatureContext, key::Key, recipe::Recipe},
    utils::burn_tokens,
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

/// Unlocks additional outputs.
///
/// - Level 0: Only 1 output ingredient is allowed.
/// - Level 1: 2 output ingredients allowed.
/// - Level 2: 3 output ingredients allowed.
/// - Level 3: Unlimited output ingredients allowed.
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
    pub const MAX_LEVEL: u8 = 3;

    pub fn unlock(&self, context: &UnlockFeatureContext) -> ProgramResult {
        let mut recipe_account = Recipe::get_writable(context.recipe)?;
        let level = recipe_account.feature_levels.additional_outputs;
        if level >= Self::MAX_LEVEL {
            return Err(TokenRecipesError::MaxFeatureLevelReached.into());
        }

        let result: Result<u64, ProgramError> = match context.mint.key {
            x if *x == self.mint_burn_1 && level < 2 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_2 && level < 3 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_3 && level < 3 => {
                recipe_account.feature_levels.additional_outputs = 3;
                Ok(1)
            }
            x if *x == self.mint_skill_1 && level < 2 => {
                recipe_account.feature_levels.additional_outputs = 2;
                Ok(0)
            }
            x if *x == self.mint_skill_2 && level < 3 => {
                recipe_account.feature_levels.additional_outputs = 3;
                Ok(0)
            }
            _ => Err(TokenRecipesError::InvalidMintToLevelUpFeature.into()),
        };
        let tokens_to_burn = result?;

        if tokens_to_burn > 0 {
            let mint_account = assert_mint_account("mint", context.mint)?;
            burn_tokens(
                context.token,
                context.mint,
                context.owner,
                tokens_to_burn,
                mint_account.decimals,
            )?;
        }

        Ok(())
    }

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
        Err(TokenRecipesError::InvalidAdditionalOutputsFeature.into())
    } else {
        Ok(())
    }
}
