use crate::state::recipe::{Recipe, RecipeStatus};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn activate_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;

    // Check: recipe.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;

    // Activate the recipe.
    recipe_account.status = RecipeStatus::Active;
    recipe_account.save(recipe)
}
