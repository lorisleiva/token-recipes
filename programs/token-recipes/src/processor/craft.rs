use crate::{
    assertions::{assert_same_pubkeys, assert_signer, assert_writable},
    state::{features::wisdom::get_experience_per_craft, recipe::Recipe},
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
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

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Check: token_program.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Check: ata_program.
    assert_same_pubkeys(
        "ata_program",
        ata_program,
        &spl_associated_token_account::id(),
    )?;

    // Ingredient inputs.
    recipe_account
        .inputs
        .iter()
        .map(|input| input.craft(account_info_iter, owner, payer, quantity))
        .collect::<ProgramResult>()?;

    // Ingredient outputs.
    recipe_account
        .outputs
        .iter()
        .map(|output| output.craft(account_info_iter, owner, payer, quantity))
        .collect::<ProgramResult>()?;

    // TODO: Handle fees and shards.

    // Recipe experience.
    recipe_account.accumulated_experience += get_experience_per_craft(&recipe_account);

    // Recipe statistics.
    recipe_account.total_crafts += 1;
    recipe_account.total_crafts_with_quantity += quantity;

    // Save recipe.
    recipe_account.save(recipe)?;

    Ok(())
}
