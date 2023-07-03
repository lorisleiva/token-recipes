use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Clone, Copy, BorshSerialize, BorshDeserialize, Debug, PartialEq, Eq)]
pub enum Key {
    Uninitialized,
    Recipe,
    IngredientRecord,
    DelegatedIngredient,
    FeesFeature,
    AdditionalOutputsFeature,
    TransferInputsFeature,
    MaxSupplyFeature,
    SolPaymentFeature,
    WisdomFeature,
}

impl Key {
    pub const LEN: usize = 1;
}
