use crate::{
    error::TokenRecipesError,
    state::{
        key::Key,
        recipe::{Recipe, RecipeStatus},
    },
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    rent::Rent,
    system_instruction, system_program,
    sysvar::Sysvar,
};

pub(crate) fn create_recipe(accounts: &[AccountInfo]) -> ProgramResult {
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
