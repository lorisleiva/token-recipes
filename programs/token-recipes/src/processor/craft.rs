use crate::{
    assertions::{assert_same_pubkeys, assert_signer, assert_writable},
    error::TokenRecipesError,
    state::{
        features::{fees::get_fees_and_shards_per_craft, wisdom::get_experience_per_craft},
        recipe::Recipe,
    },
    utils::transfer_lamports,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    system_program,
};

pub(crate) fn craft<'a>(accounts: &'a [AccountInfo<'a>], quantity: u64) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let owner = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let ata_program = next_account_info(account_info_iter)?;

    // Check: recipe.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_active()?;

    // Check: owner.
    assert_signer("owner", owner)?;

    // Check: payer.
    assert_signer("payer", payer)?;
    assert_writable("payer", payer)?;

    // Check: programs.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;
    assert_same_pubkeys(
        "ata_program",
        ata_program,
        &spl_associated_token_account::id(),
    )?;

    // Craft ingredient inputs.
    recipe_account
        .inputs
        .iter()
        .map(|input| input.craft(account_info_iter, owner, payer, quantity))
        .collect::<ProgramResult>()?;

    // Craft ingredient outputs.
    recipe_account
        .outputs
        .iter()
        .map(|output| output.craft(account_info_iter, owner, payer, quantity))
        .collect::<ProgramResult>()?;

    // Take fees.
    let (total_fees, admin_fees, shards) = get_fees_and_shards_per_craft(&recipe_account)?;
    if total_fees > 0 {
        transfer_lamports(payer, recipe, total_fees, None)?;
    }

    // Update admin fees and shards.
    recipe_account.accumulated_admin_fees = recipe_account
        .accumulated_admin_fees
        .checked_add(admin_fees)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;
    recipe_account.accumulated_shards =
        recipe_account
            .accumulated_shards
            .checked_add(shards)
            .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    // Update experience.
    recipe_account.accumulated_experience = recipe_account
        .accumulated_experience
        .checked_add(get_experience_per_craft(&recipe_account))
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    // Update statistics.
    recipe_account.total_crafts = recipe_account
        .total_crafts
        .checked_add(1)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;
    recipe_account.total_crafts_with_quantity = recipe_account
        .total_crafts_with_quantity
        .checked_add(quantity)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    // Save recipe.
    recipe_account.save(recipe)?;

    Ok(())
}
