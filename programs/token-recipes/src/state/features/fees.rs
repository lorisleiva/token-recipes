use crate::{error::TokenRecipesError, state::key::Key};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

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
