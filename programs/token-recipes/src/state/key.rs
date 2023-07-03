use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Clone, Copy, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    Recipe,
    IngredientRecord,
    DelegatedIngredient,
}

impl Key {
    pub const LEN: usize = 1;
}
