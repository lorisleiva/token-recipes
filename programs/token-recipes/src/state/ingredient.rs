use crate::state::key::Key;
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct Ingredient {
    pub key: Key,
    pub mint: Pubkey,
    pub recipe: Pubkey,
}
// TODO: seeds helper.
