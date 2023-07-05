use crate::{
    instruction::TokenRecipesInstruction,
    processor::{
        activate_recipe::activate_recipe, add_ingredient::add_ingredient,
        admin_set_feature::admin_set_feature, collect_experience::collect_experience,
        collect_fees::collect_fees, craft::craft, create_recipe::create_recipe,
        delete_recipe::delete_recipe, pause_recipe::pause_recipe,
        remove_ingredient::remove_ingredient, set_fees::set_fees, unlock_feature::unlock_feature,
    },
};
use borsh::BorshDeserialize;
use solana_program::{account_info::AccountInfo, entrypoint::ProgramResult, msg, pubkey::Pubkey};

pub mod activate_recipe;
pub mod add_ingredient;
pub mod admin_set_feature;
pub mod collect_experience;
pub mod collect_fees;
pub mod craft;
pub mod create_recipe;
pub mod delete_recipe;
pub mod pause_recipe;
pub mod remove_ingredient;
pub mod set_fees;
pub mod unlock_feature;

pub struct Processor;
impl Processor {
    pub fn process_instruction<'a>(
        _program_id: &Pubkey,
        accounts: &'a [AccountInfo<'a>],
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
            TokenRecipesInstruction::DeleteRecipe => {
                msg!("Instruction: DeleteRecipe");
                delete_recipe(accounts)
            }
            TokenRecipesInstruction::AdminSetFeature { feature } => {
                msg!("Instruction: AdminSetFeature");
                admin_set_feature(accounts, feature)
            }
            TokenRecipesInstruction::UnlockFeature => {
                msg!("Instruction: UnlockFeature");
                unlock_feature(accounts)
            }
            TokenRecipesInstruction::SetFees { fees } => {
                msg!("Instruction: SetFees");
                set_fees(accounts, fees)
            }
            TokenRecipesInstruction::CollectFees => {
                msg!("Instruction: CollectFees");
                collect_fees(accounts)
            }
            TokenRecipesInstruction::CollectExperience => {
                msg!("Instruction: CollectExperience");
                collect_experience(accounts)
            }
        }
    }
}
