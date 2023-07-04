use crate::{
    error::TokenRecipesError,
    state::{
        features::{
            additional_outputs::AdditionalOutputsFeature, fees::FeesFeature,
            max_supply::MaxSupplyFeature, sol_payment::SolPaymentFeature,
            transfer_inputs::TransferInputsFeature, wisdom::WisdomFeature,
        },
        key::Key,
    },
};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
};

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

pub struct UnlockFeatureContext<'a> {
    pub recipe: &'a AccountInfo<'a>,
    pub owner: &'a AccountInfo<'a>,
    pub mint: &'a AccountInfo<'a>,
    pub token: &'a AccountInfo<'a>,
}

impl Feature {
    pub fn unlock(&self, context: &UnlockFeatureContext) -> ProgramResult {
        match self {
            Self::Fees(feature) => feature.unlock(context),
            Self::AdditionalOutputs(feature) => feature.unlock(context),
            Self::TransferInputs(feature) => feature.unlock(context),
            Self::MaxSupply(feature) => feature.unlock(context),
            Self::SolPayment(feature) => feature.unlock(context),
            Self::Wisdom(feature) => feature.unlock(context),
        }
    }
    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let key = account.try_borrow_data()?[0];
        match key {
            x if x == Key::FeesFeature as u8 => Ok(Self::Fees(FeesFeature::load(account)?)),
            x if x == Key::AdditionalOutputsFeature as u8 => Ok(Self::AdditionalOutputs(
                AdditionalOutputsFeature::load(account)?,
            )),
            x if x == Key::TransferInputsFeature as u8 => {
                Ok(Self::TransferInputs(TransferInputsFeature::load(account)?))
            }
            x if x == Key::MaxSupplyFeature as u8 => {
                Ok(Self::MaxSupply(MaxSupplyFeature::load(account)?))
            }
            x if x == Key::SolPaymentFeature as u8 => {
                Ok(Self::SolPayment(SolPaymentFeature::load(account)?))
            }
            x if x == Key::WisdomFeature as u8 => Ok(Self::Wisdom(WisdomFeature::load(account)?)),
            _ => {
                msg!("Invalid account key for feature_pda");
                Err(TokenRecipesError::InvalidAccountKey.into())
            }
        }
    }
}
