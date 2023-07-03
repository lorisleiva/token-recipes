use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_program_owner, assert_same_pubkeys,
        assert_signer, assert_writable,
    },
    state::{
        delegated_ingredient::DelegatedIngredient,
        ingredient_record::IngredientRecord,
        key::Key,
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

    // Check: authority.
    assert_signer("authority", authority)?;

    // Check: payer.
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Check: token_program.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Check: recipe.
    assert_writable("recipe", recipe)?;
    assert_program_owner("recipe", recipe, &crate::id())?;
    assert_account_key("recipe", recipe, Key::Recipe)?;
    let mut recipe_account = Recipe::load(recipe)?;
    assert_same_pubkeys("authority", authority, &recipe_account.authority)?;

    // TODO: Get IngredientInput or Output here.

    // Check: mint.
    assert_writable("mint", mint)?;
    assert_program_owner("mint", mint, &spl_token::id())?;
    assert_data_size("mint", mint, 82)?;

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
