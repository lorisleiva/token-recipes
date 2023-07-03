use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Clone, Copy, BorshSerialize, BorshDeserialize, Debug)]
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
}

impl Key {
    pub const LEN: usize = 1;
}
