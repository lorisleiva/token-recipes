use crate::{
    assertions::{
        assert_account_key, assert_program_owner, assert_same_pubkeys, assert_signer,
        assert_writable,
    },
    error::TokenRecipesError,
    state::{key::Key, recipe::Recipe},
    utils::close_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn delete_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;

    // Check: authority.
    assert_signer("authority", authority)?;

    // Check: payer.
    assert_signer("payer", payer)?;

    // Check: recipe.
    assert_writable("recipe", recipe)?;
    assert_program_owner("recipe", recipe, &crate::id())?;
    assert_account_key("recipe", recipe, Key::Recipe)?;
    let recipe_account = Recipe::load(recipe)?;
    assert_same_pubkeys("authority", authority, &recipe_account.authority)?;
    if recipe_account.inputs.len() > 0 || recipe_account.outputs.len() > 0 {
        return Err(TokenRecipesError::RecipeMustBeEmptyBeforeItCanBeDeleted.into());
    }

    // Activate the recipe.
    close_account(recipe, payer)
}
