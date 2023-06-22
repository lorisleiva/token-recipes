use crate::{
    assertions::{assert_empty, assert_same_pubkeys, assert_signer, assert_writable},
    state::{
        key::Key,
        recipe::{Recipe, RecipeStatus},
    },
    utils::create_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    system_program,
};

pub(crate) fn create_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Check: recipe.
    assert_writable("recipe", recipe)?;
    assert_signer("recipe", recipe)?;
    assert_empty("recipe", recipe)?;

    // Check: authority.
    // No check needed.

    // Check: payer.
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Create the recipe account.
    create_account(
        recipe,
        payer,
        system_program,
        Recipe::INITIAL_LEN,
        &crate::id(),
        None,
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
