use crate::{
    error::TokenRecipesError,
    state::{features::UnlockFeatureContext, key::Key},
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
    /// The mint used to mint shards.
    pub experience_mint: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 4.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 6.
    pub mint_burn_2: Pubkey,
}

impl WisdomFeature {
    pub const LEN: usize = 1 + 32 * 3;

    pub fn unlock(&self, _context: &UnlockFeatureContext) -> ProgramResult {
        Ok(())
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

// TODO: Function that returns experience based on level.
