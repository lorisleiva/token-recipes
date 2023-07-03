use crate::{
    assertions::{assert_mint_account, assert_same_pubkeys, assert_signer, assert_writable},
    state::{
        delegated_ingredient::DelegatedIngredient,
        ingredient_record::IngredientRecord,
        recipe::{IngredientType, Recipe},
    },
    utils::realloc_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    system_program,
};

pub(crate) fn remove_ingredient(
    accounts: &[AccountInfo],
    ingredient_type: IngredientType,
) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let ingredient_record = next_account_info(account_info_iter)?;
    let delegated_ingredient = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Check: recipe.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;

    // Check: payer.
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Check: token_program.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // TODO: Get IngredientInput or Output here.

    // Check: mint.
    assert_writable("mint", mint)?;
    assert_mint_account("mint", mint)?;

    // Remove the ingredient from the recipe account and realloc.
    let new_size = match ingredient_type {
        IngredientType::Input => {
            let ingredient = recipe_account.remove_ingredient_input(mint.key)?;
            recipe.data_len() - ingredient.len()
        }
        IngredientType::Output => {
            let ingredient = recipe_account.remove_ingredient_output(mint.key)?;
            recipe.data_len() - ingredient.len()
        }
    };
    realloc_account(recipe, payer, system_program, new_size)?;
    recipe_account.save(recipe)?;

    // Update or close the ingredient record account.
    let mut ingredient_record_account = IngredientRecord::get(ingredient_record, mint, recipe)?;
    match ingredient_type {
        IngredientType::Input => ingredient_record_account.set_input(false)?,
        IngredientType::Output => ingredient_record_account.set_output(false)?,
    }
    ingredient_record_account.save_or_close(ingredient_record, payer)?;

    // Decrent or close the delegated ingredient account.
    if matches!(ingredient_type, IngredientType::Output) {
        DelegatedIngredient::close_or_decrement(delegated_ingredient, mint, authority, payer)?;
    }

    Ok(())
}
