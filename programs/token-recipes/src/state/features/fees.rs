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
    pub destination: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 10.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 11.
    pub mint_burn_2: Pubkey,
    /// When burned, allows leveling up straight to 11.
    pub mint_burn_3: Pubkey,
    /// Without burning, allows leveling up straight to 10.
    pub mint_skill_1: Pubkey,
    /// Without burning, allows leveling up straight to 11.
    pub mint_skill_2: Pubkey,
}

impl FeesFeature {
    pub const LEN: usize = 1 + 32 * 6;

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

/// Asserts that the recipe can set custom fees.
pub fn asserts_can_set_fees(recipe: &Recipe) -> ProgramResult {
    let level = recipe.feature_levels.fees;
    if level < 11 {
        msg!(
            "You cannot set custom fees for this recipe. Level up the \"Fees\" feature to level 11 to enable this feature.",
        );
        Err(TokenRecipesError::InvalidFees.into())
    } else {
        Ok(())
    }
}
