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

/// Unlocks more experience when crafting.
///
/// - Level 0: 100 experience points per craft.
/// - Level 1: 125 experience points per craft.
/// - Level 2: 150 experience points per craft.
/// - Level 3: 175 experience points per craft.
/// - Level 4: 200 experience points per craft.
/// - Level 5: 250 experience points per craft.
/// - Level 6: 300 experience points per craft.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct WisdomFeature {
    /// Account discriminator.
    pub key: Key,
    /// The mint used to mint shards. The mint authority must be set to the wisdom feature PDA.
    pub experience_mint: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 4.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 6.
    pub mint_burn_2: Pubkey,
}

impl WisdomFeature {
    pub const LEN: usize = 1 + 32 * 3;
    pub const MAX_LEVEL: u8 = 6;

    pub fn unlock(&self, context: &UnlockFeatureContext) -> ProgramResult {
        let mut recipe_account = Recipe::get_writable(context.recipe)?;
        let level = recipe_account.feature_levels.wisdom;
        if level >= Self::MAX_LEVEL {
            return Err(TokenRecipesError::MaxFeatureLevelReached.into());
        }

        let result: Result<u64, ProgramError> = match context.mint.key {
            x if *x == self.mint_burn_1 && level < 4 => {
                recipe_account.feature_levels.wisdom += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_2 && level < 6 => {
                recipe_account.feature_levels.wisdom += 1;
                Ok(1)
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
        vec!["features".as_bytes(), "wisdom".as_bytes()]
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        WisdomFeature::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing Wisdom account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing Wisdom account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

pub fn get_experience_per_craft(recipe: &Recipe) -> u64 {
    match recipe.feature_levels.wisdom {
        1 => 125,
        2 => 150,
        3 => 175,
        4 => 200,
        5 => 250,
        6 => 300,
        _ => 100,
    }
}
