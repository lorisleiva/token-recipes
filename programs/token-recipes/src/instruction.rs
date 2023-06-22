use crate::state::recipe::IngredientType;
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
};

#[derive(Debug, Clone, ShankInstruction, BorshSerialize, BorshDeserialize)]
#[rustfmt::skip]
pub enum TokenRecipesInstruction {
    /// Create a new empty recipe.
    #[account(0, writable, signer, name="recipe", desc = "The address of the new recipe account")]
    #[account(1, name="authority", desc = "The authority of the new recipe account")]
    #[account(2, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(3, name="system_program", desc = "The system program")]
    CreateRecipe,

    /// Add an ingredient to a recipe.
    /// This could be an input or output ingredient.
    /// CAREFUL: If the ingredient is an output, the mint authority will be transferred to the program.
    /// Removing the ingredient will transfer the mint authority back to the recipe authority if and only
    /// if no other recipe uses this mint as an output ingredient.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, writable, name="mint", desc = "The mint account of the ingredient")]
    #[account(2, writable, name="ingredient_record", desc = "The ingredient record PDA to discover their recipes")]
    #[account(3, optional, writable, name="delegated_ingredient", desc = "The delegated ingredient PDA for output ingredients that takes over the mint authority")]
    #[account(4, signer, name="authority", desc = "The authority of the recipe account and the mint authority of the ingredient if it's an output ingredient")]
    #[account(5, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(6, name="system_program", desc = "The system program")]
    #[account(7, name="token_program", desc = "The token program")]
    #[default_optional_accounts]
    AddIngredient {
        /// The amount of tokens required if it's an input ingredient or minted otherwise.
        amount: u64,
        /// Whether the ingredient is an input or output.
        ingredient_type: IngredientType,
        /// If the ingredient is an output, the maximum supply that can ever be minted.
        max_supply: Option<u64>,
    },
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

pub fn add_ingredient(
    recipe: &Pubkey,
    mint: &Pubkey,
    ingredient_record: &Pubkey,
    delegated_ingredient: Option<&Pubkey>,
    authority: &Pubkey,
    payer: &Pubkey,
    amount: u64,
    ingredient_type: IngredientType,
    max_supply: Option<u64>,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new_readonly(*recipe, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new(*ingredient_record, false),
        AccountMeta::new(*delegated_ingredient.unwrap_or(&crate::id()), false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*payer, true),
        AccountMeta::new_readonly(solana_program::system_program::ID, false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];
    Instruction {
        program_id: crate::ID,
        accounts,
        data: TokenRecipesInstruction::AddIngredient {
            amount,
            ingredient_type,
            max_supply,
        }
        .try_to_vec()
        .unwrap(),
    }
}
