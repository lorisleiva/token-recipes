use borsh::{BorshDeserialize, BorshSerialize};

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
