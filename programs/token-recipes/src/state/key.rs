use borsh::{BorshDeserialize, BorshSerialize};

#[derive(Clone, Copy, BorshSerialize, BorshDeserialize, Debug)]
pub enum Key {
    Uninitialized,
    Recipe,
    Ingredient,
    DelegatedIngredient,
}
