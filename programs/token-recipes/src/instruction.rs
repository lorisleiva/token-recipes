use crate::state::IngredientType;
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
};

#[repr(C)]
#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub struct AddIngredientArgs {
    /// The amount of tokens required if it's an input ingredient or minted otherwise.
    pub amount: u64,
    /// Whether the ingredient is an input or output.
    pub ingredient_type: IngredientType,
    /// If the ingredient is an output, the maximum supply that can ever be minted.
    pub max_supply: Option<u64>,
}

#[derive(Debug, Clone, ShankInstruction, BorshSerialize, BorshDeserialize)]
#[rustfmt::skip]
pub enum TokenRecipesInstruction {
    /// Create My Account.
    /// A detailed description of the instruction.
    #[account(0, writable, signer, name="recipe", desc = "The address of the new recipe account")]
    #[account(1, name="authority", desc = "The authority of the new recipe account")]
    #[account(2, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(3, name="system_program", desc = "The system program")]
    CreateRecipe,
}

pub fn create_recipe(recipe: &Pubkey, authority: &Pubkey, payer: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*recipe, true),
        AccountMeta::new_readonly(*authority, false),
        AccountMeta::new(*payer, true),
        AccountMeta::new_readonly(solana_program::system_program::ID, false),
    ];
    Instruction {
        program_id: crate::ID,
        accounts,
        data: TokenRecipesInstruction::CreateRecipe.try_to_vec().unwrap(),
    }
}
