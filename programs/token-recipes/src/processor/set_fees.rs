use crate::state::{features::fees::asserts_can_set_fees, recipe::Recipe};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn set_fees(accounts: &[AccountInfo], fees: u64) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;

    // Check: recipe.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;

    // Set the fees.
    asserts_can_set_fees(&recipe_account)?;
    recipe_account.fees = fees;
    recipe_account.save(recipe)
}
