use crate::{
    instruction::TokenRecipesInstruction,
    processor::{
        activate_recipe::activate_recipe, add_ingredient::add_ingredient, craft::craft,
        create_recipe::create_recipe, pause_recipe::pause_recipe,
        remove_ingredient::remove_ingredient,
    },
};
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod activate_recipe;
pub mod add_ingredient;
pub mod craft;
pub mod create_recipe;
pub mod pause_recipe;
pub mod remove_ingredient;

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
                destination,
                max_supply,
            } => {
                msg!("Instruction: AddIngredient");
                add_ingredient(accounts, amount, ingredient_type, destination, max_supply)
            }
            TokenRecipesInstruction::RemoveIngredient { ingredient_type } => {
                msg!("Instruction: RemoveIngredient");
                remove_ingredient(accounts, ingredient_type)
            }
            TokenRecipesInstruction::ActivateRecipe => {
                msg!("Instruction: ActivateRecipe");
                activate_recipe(accounts)
            }
            TokenRecipesInstruction::PauseRecipe => {
                msg!("Instruction: PauseRecipe");
                pause_recipe(accounts)
            }
            TokenRecipesInstruction::Craft { quantity } => {
                msg!("Instruction: Craft");
                craft(accounts, quantity)
            }
        }
    }
}
