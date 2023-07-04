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

/// Unlocks recipe fees.
///
/// - Level 0: No fees when crafting.
/// - Level 1: 10% of base fees (see below) when crafting, the rest goes to the program admin.
///            90% of base fee lamports are added as "shards" to the recipe to be minted
///            as a special ingredient when collecting fees.
/// - Level 2: 20% of base fees, 80% shards.
/// - Level 3: 30% of base fees, 70% shards.
/// - Level 4: 40% of base fees, 60% shards.
/// - Level 5: 50% of base fees, 50% shards.
/// - Level 6: 60% of base fees, 40% shards.
/// - Level 7: 70% of base fees, 30% shards.
/// - Level 8: 80% of base fees, 20% shards.
/// - Level 9: 90% of base fees, 10% shards.
/// - Level 10: 100% of base fees, 10% shards. From this level, the program admin no longer receives fees.
/// - Level 11: 100% of custom fees. 10% shards based on base fees.
///
/// Base fee: 0.02 SOL.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct FeesFeature {
    /// Account discriminator.
    pub key: Key,
    /// The admin public key receiving the admin part of the fees.
    pub admin_destination: Pubkey,
    /// The mint used to mint shards. The mint authority must be set to the fees feature PDA.
    pub shard_mint: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 1.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 10.
    pub mint_burn_2: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 11.
    pub mint_burn_3: Pubkey,
    /// When burned, allows leveling up straight to 10.
    pub mint_burn_4: Pubkey,
    /// When burned, allows leveling up straight to 11.
    pub mint_burn_5: Pubkey,
    /// Without burning, allows leveling up straight to 1.
    pub mint_skill_1: Pubkey,
    /// Without burning, allows leveling up straight to 10.
    pub mint_skill_2: Pubkey,
    /// Without burning, allows leveling up straight to 11.
    pub mint_skill_3: Pubkey,
}

impl FeesFeature {
    pub const LEN: usize = 1 + 32 * 10;
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
            x if *x == self.mint_burn_2 && level < 10 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_3 && level < 11 => {
                recipe_account.feature_levels.additional_outputs += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_4 && level < 10 => {
                recipe_account.feature_levels.additional_outputs = 10;
                Ok(1)
            }
            x if *x == self.mint_burn_5 && level < 11 => {
                recipe_account.feature_levels.additional_outputs = 11;
                Ok(1)
            }
            x if *x == self.mint_skill_1 && level < 1 => {
                recipe_account.feature_levels.additional_outputs = 1;
                Ok(0)
            }
            x if *x == self.mint_skill_2 && level < 10 => {
                recipe_account.feature_levels.additional_outputs = 10;
                Ok(0)
            }
            x if *x == self.mint_skill_3 && level < 11 => {
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

        Ok(())
    }

    pub fn seeds<'a>() -> Vec<&'a [u8]> {
        vec!["features".as_bytes(), "fees".as_bytes()]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        FeesFeature::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing FeesFeature account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing FeesFeature account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

// TODO: Function that returns fees, admin fees and shards base on level and recipe.

/// Asserts that the recipe can set custom fees.
pub fn asserts_can_set_fees(recipe: &Recipe) -> ProgramResult {
    let level = recipe.feature_levels.fees;
    if level < 11 {
        msg!(
            "You cannot set custom fees for this recipe. Level up the \"Fees\" feature to level 11 to enable this feature.",
        );
        Err(TokenRecipesError::InvalidFeesFeature.into())
    } else {
        Ok(())
    }
}
