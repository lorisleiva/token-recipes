use crate::state::key::Key;
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::pubkey::Pubkey;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct DelegatedIngredient {
    pub key: Key,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub counter: u32,
}
// TODO: seeds helper.
