use crate::{
    assertions::assert_signer, error::TokenRecipesError, state::recipe::Recipe,
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

    // Check: recipe.
    let recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;

    // Check: payer.
    assert_signer("payer", payer)?;

    if recipe_account.inputs.len() > 0 || recipe_account.outputs.len() > 0 {
        return Err(TokenRecipesError::RecipeMustBeEmptyBeforeItCanBeDeleted.into());
    }

    // Activate the recipe.
    close_account(recipe, payer)
}
