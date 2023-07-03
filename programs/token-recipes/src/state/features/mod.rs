use self::{
    additional_outputs::AdditionalOutputsFeature, fees::FeesFeature, max_supply::MaxSupplyFeature,
    sol_payment::SolPaymentFeature, transfer_inputs::TransferInputsFeature, wisdom::WisdomFeature,
};
use borsh::{BorshDeserialize, BorshSerialize};

pub mod additional_outputs;
pub mod fees;
pub mod max_supply;
pub mod sol_payment;
pub mod transfer_inputs;
pub mod wisdom;

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone, Default)]
pub struct FeatureLevels {
    pub fees: u8,
    pub additional_outputs: u8,
    pub transfer_inputs: u8,
    pub max_supply: u8,
    pub sol_payment: u8,
    pub wisdom: u8,
    pub _padding: [u8; 10],
}

impl FeatureLevels {
    pub const LEN: usize = 16;
}

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum Feature {
    Fees(FeesFeature),
    AdditionalOutputs(AdditionalOutputsFeature),
    TransferInputs(TransferInputsFeature),
    MaxSupply(MaxSupplyFeature),
    SolPayment(SolPaymentFeature),
    Wisdom(WisdomFeature),
}
