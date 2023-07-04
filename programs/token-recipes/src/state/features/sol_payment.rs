use crate::{
    assertions::assert_mint_account,
    error::TokenRecipesError,
    state::{features::UnlockFeatureContext, key::Key, recipe::Recipe},
    utils::burn_tokens,
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, native_token::LAMPORTS_PER_SOL,
    program_error::ProgramError, pubkey::Pubkey,
};

/// Unlocks SOL payment inputs.
///
/// - Level 0: No SOL payment allowed.
/// - Level 1: SOL payment allowed up to 1 SOL.
/// - Level 2: SOL payment allowed up to 2 SOL.
/// - Level 3: SOL payment allowed up to 4 SOL.
/// - Level 4: SOL payment allowed up to 8 SOL.
/// - Level 5: SOL payment allowed up to 16 SOL.
/// - Level 6: SOL payment allowed up to 32 SOL.
/// - Level 7: SOL payment allowed up to 64 SOL.
/// - Level 8: SOL payment allowed up to 128 SOL.
/// - Level 9: SOL payment allowed up to 256 SOL.
/// - Level 10: SOL payment allowed up to 512 SOL.
/// - Level 11: SOL payment allowed for any amount of SOL.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct SolPaymentFeature {
    /// Account discriminator.
    pub key: Key,
    /// When burned, allows leveling up by 1 from 0 to 1.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 3.
    pub mint_burn_2: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 6.
    pub mint_burn_3: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 10.
    pub mint_burn_4: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 11.
    pub mint_burn_5: Pubkey,
    /// When burned, allows leveling up straight to 3.
    pub mint_burn_6: Pubkey,
    /// When burned, allows leveling up straight to 6.
    pub mint_burn_7: Pubkey,
    /// When burned, allows leveling up straight to 10.
    pub mint_burn_8: Pubkey,
    /// When burned, allows leveling up straight to 11.
    pub mint_burn_9: Pubkey,
    /// Without burning, allows leveling up straight to 1.
    pub mint_skill_1: Pubkey,
    /// Without burning, allows leveling up straight to 3.
    pub mint_skill_2: Pubkey,
    /// Without burning, allows leveling up straight to 6.
    pub mint_skill_3: Pubkey,
    /// Without burning, allows leveling up straight to 10.
    pub mint_skill_4: Pubkey,
    /// Without burning, allows leveling up straight to 11.
    pub mint_skill_5: Pubkey,
}

impl SolPaymentFeature {
    pub const LEN: usize = 1 + 32 * 14;
    pub const MAX_LEVEL: u8 = 11;

    pub fn unlock(&self, context: &UnlockFeatureContext) -> ProgramResult {
        let mut recipe_account = Recipe::get_writable(context.recipe)?;
        let level = recipe_account.feature_levels.additional_outputs;
        if level >= Self::MAX_LEVEL {
            return Err(TokenRecipesError::MaxFeatureLevelReached.into());
        }

        let result: Result<u64, ProgramError> = match context.mint.key {
            x if *x == self.mint_burn_1 && level < 1 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_2 && level < 3 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_3 && level < 6 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_4 && level < 10 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_5 && level < 11 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_6 && level < 3 => {
                recipe_account.feature_levels.additional_outputs = 3;
                Ok(1)
            }
            x if *x == self.mint_burn_7 && level < 6 => {
                recipe_account.feature_levels.additional_outputs = 6;
                Ok(1)
            }
            x if *x == self.mint_burn_8 && level < 10 => {
                recipe_account.feature_levels.additional_outputs = 10;
                Ok(1)
            }
            x if *x == self.mint_burn_9 && level < 11 => {
                recipe_account.feature_levels.additional_outputs = 11;
                Ok(1)
            }
            x if *x == self.mint_skill_1 && level < 1 => {
                recipe_account.feature_levels.additional_outputs = 1;
                Ok(0)
            }
            x if *x == self.mint_skill_2 && level < 3 => {
                recipe_account.feature_levels.additional_outputs = 3;
                Ok(0)
            }
            x if *x == self.mint_skill_3 && level < 6 => {
                recipe_account.feature_levels.additional_outputs = 6;
                Ok(0)
            }
            x if *x == self.mint_skill_4 && level < 10 => {
                recipe_account.feature_levels.additional_outputs = 10;
                Ok(0)
            }
            x if *x == self.mint_skill_5 && level < 11 => {
                recipe_account.feature_levels.additional_outputs = 11;
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

        recipe_account.save(context.recipe)
    }

    pub fn seeds<'a>() -> Vec<&'a [u8]> {
        vec!["features".as_bytes(), "sol_payment".as_bytes()]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        SolPaymentFeature::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing SolPaymentFeature account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing SolPaymentFeature account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

/// Asserts that the recipe does not request more SOL than allowed by the feature level.
/// Make sure to use AFTER the recipe was updated.
pub fn assert_valid_sol_payment(recipe: &Recipe) -> ProgramResult {
    let sol_amount = 0 as u64; // TODO

    match recipe.feature_levels.sol_payment {
        0 => assert_max_sol_payment(sol_amount, 0),
        1 => assert_max_sol_payment(sol_amount, LAMPORTS_PER_SOL),
        2 => assert_max_sol_payment(sol_amount, 2 * LAMPORTS_PER_SOL),
        3 => assert_max_sol_payment(sol_amount, 4 * LAMPORTS_PER_SOL),
        4 => assert_max_sol_payment(sol_amount, 8 * LAMPORTS_PER_SOL),
        5 => assert_max_sol_payment(sol_amount, 16 * LAMPORTS_PER_SOL),
        6 => assert_max_sol_payment(sol_amount, 32 * LAMPORTS_PER_SOL),
        7 => assert_max_sol_payment(sol_amount, 64 * LAMPORTS_PER_SOL),
        8 => assert_max_sol_payment(sol_amount, 128 * LAMPORTS_PER_SOL),
        9 => assert_max_sol_payment(sol_amount, 256 * LAMPORTS_PER_SOL),
        10 => assert_max_sol_payment(sol_amount, 512 * LAMPORTS_PER_SOL),
        _ => Ok(()),
    }
}

pub fn assert_max_sol_payment(sol_amount: u64, max_allowed: u64) -> ProgramResult {
    if sol_amount > max_allowed {
        msg!(
            "You cannot request more than {} lamports for this recipe. Level up the \"SOL Payment\" feature to increase the limit.",
            max_allowed
        );
        Err(TokenRecipesError::InvalidSolPaymentFeature.into())
    } else {
        Ok(())
    }
}
