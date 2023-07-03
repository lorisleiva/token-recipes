use crate::{
    assertions::{
        assert_account_key, assert_program_owner, assert_same_pubkeys, assert_signer,
        assert_writable,
    },
    state::{
        key::Key,
        recipe::{Recipe, RecipeStatus},
    },
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn pause_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;

    // Check: recipe.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_authority(authority)?;

    // Check: authority.
    assert_signer("authority", authority)?;

    // Activate the recipe.
    recipe_account.status = RecipeStatus::Paused;
    recipe_account.save(recipe)
}
