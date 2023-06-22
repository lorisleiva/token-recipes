use crate::{
    error::TokenRecipesError,
    state::{
        key::Key,
        recipe::{Recipe, RecipeStatus},
    },
    utils::create_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg, system_program,
};

pub(crate) fn create_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Guards.
    if *system_program.key != system_program::id() {
        msg!("Invalid system program account");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    if !recipe.data_is_empty() {
        msg!("Recipe account should not already be initialized");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }

    // Create the recipe account.
    create_account(
        recipe,
        payer,
        system_program,
        Recipe::INITIAL_LEN,
        &crate::id(),
    )?;

    // Initialize the recipe account.
    Recipe {
        key: Key::Recipe,
        authority: *authority.key,
        status: RecipeStatus::Paused,
        inputs: vec![],
        outputs: vec![],
    }
    .save(recipe)
}
