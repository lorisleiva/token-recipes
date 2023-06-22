use crate::{
    instruction::TokenRecipesInstruction,
    processor::{add_ingredient::add_ingredient, create_recipe::create_recipe},
};
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod add_ingredient;
pub mod create_recipe;

pub struct Processor;
impl Processor {
    pub fn process_instruction(
        _program_id: &Pubkey,
        accounts: &[AccountInfo],
        instruction_data: &[u8],
    ) -> ProgramResult {
        let instruction: TokenRecipesInstruction =
            TokenRecipesInstruction::try_from_slice(instruction_data)?;
        match instruction {
            TokenRecipesInstruction::CreateRecipe => {
                msg!("Instruction: CreateRecipe");
                create_recipe(accounts)
            }
            TokenRecipesInstruction::AddIngredient {
                amount,
                ingredient_type,
                max_supply,
            } => {
                msg!("Instruction: AddIngredient");
                add_ingredient(accounts, amount, ingredient_type, max_supply)
            }
        }
    }
}