use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

pub mod additional_outputs;
pub mod fees;

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone, Default)]
pub struct FeatureLevels {
    pub fees: u8,
    pub additional_outputs: u8,
    pub _padding: [u8; 8],
}

impl FeatureLevels {
    pub const LEN: usize = 1 + 1 + 8;
}

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum FeatureData {
    Fees {
        destination: Pubkey,
        mint_burn_1: Pubkey,
        mint_burn_2: Pubkey,
        mint_burn_3: Pubkey,
        mint_skill_1: Pubkey,
        mint_skill_2: Pubkey,
    },
    AdditionalOutputs {
        mint_burn_1: Pubkey,
        mint_burn_2: Pubkey,
        mint_burn_3: Pubkey,
        mint_skill_1: Pubkey,
        mint_skill_2: Pubkey,
    },
}
