use crate::error::TokenRecipesError;
use crate::instruction::TokenRecipesInstruction;
use crate::state::{IngredientInput, IngredientOutput, IngredientType, Key, Recipe, RecipeStatus};
use borsh::BorshDeserialize;
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

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

fn create_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let rent = Rent::get()?;

    // Guards.
    if *system_program.key != system_program::id() {
        msg!("Invalid system program account");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    if !recipe.data_is_empty() {
        msg!("Recipe account should not already be initialized");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }

    // Fetch the space and minimum lamports required for rent exemption.
    let space: usize = Recipe::INITIAL_LEN;
    let lamports: u64 = rent.minimum_balance(space);

    // CPI to the System Program.
    invoke(
        &system_instruction::create_account(
            payer.key,
            recipe.key,
            lamports,
            space as u64,
            &crate::id(),
        ),
        &[payer.clone(), recipe.clone(), system_program.clone()],
    )?;

    let recipe_account = Recipe {
        key: Key::Recipe,
        authority: *authority.key,
        status: RecipeStatus::Paused,
        inputs: vec![],
        outputs: vec![],
    };

    recipe_account.save(recipe)
}

fn add_ingredient(
    accounts: &[AccountInfo],
    amount: u64,
    ingredient_type: IngredientType,
    max_supply: Option<u64>,
) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Guards.
    if *system_program.key != system_program::id() {
        msg!("Invalid system program account");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    if *recipe.owner != crate::id() {
        msg!("Recipe account must be owned by the token-recipes program");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    let mut recipe_account = Recipe::load(recipe)?;
    if recipe_account.authority != *authority.key {
        msg!("Recipe account must be owner by the provided authority");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    if !authority.is_signer {
        msg!("The recipe authority must sign the transaction");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }

    // Find the new space for the recipe account.
    let space: usize = match ingredient_type {
        IngredientType::Input => recipe.data_len() + IngredientInput::LEN,
        IngredientType::Output => recipe.data_len() + IngredientOutput::LEN,
    };

    // Realloc the recipe account.
    realloc(recipe, payer, system_program, space)?;

    // Add the ingredient to the recipe account.
    match ingredient_type {
        IngredientType::Input => {
            recipe_account.inputs.push(IngredientInput {
                mint: *mint.key,
                amount,
            });
        }
        IngredientType::Output => recipe_account.outputs.push(IngredientOutput {
            mint: *mint.key,
            amount,
            max_supply: max_supply.unwrap_or(u64::MAX),
        }),
    }
    recipe_account.save(recipe)

    // TODO: Create the ingredient PDA.
    // TODO: Create the delegated ingredient PDA.
}

/// Resize an account using realloc, lifted from Solana Cookbook.
#[inline(always)]
pub fn realloc<'a>(
    target_account: &AccountInfo<'a>,
    funding_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    new_size: usize,
) -> ProgramResult {
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_size);

    let lamports_diff = new_minimum_balance.saturating_sub(target_account.lamports());
    invoke(
        &system_instruction::transfer(funding_account.key, target_account.key, lamports_diff),
        &[
            funding_account.clone(),
            target_account.clone(),
            system_program.clone(),
        ],
    )?;

    target_account.realloc(new_size, false)?;

    Ok(())
}
