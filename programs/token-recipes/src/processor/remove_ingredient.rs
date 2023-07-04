use crate::{
    assertions::{assert_same_pubkeys, assert_signer, assert_writable},
    state::recipe::{Ingredient, IngredientType, Recipe},
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

    // Check accounts.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    let (ingredient, index) = recipe_account.find_ingredient(ingredient_type, mint)?;
    match ingredient {
        Ingredient::Input(input) => input.remove(
            &mut recipe_account,
            index,
            recipe,
            mint,
            ingredient_record,
            payer,
            system_program,
        ),
        Ingredient::Output(output) => output.remove(
            &mut recipe_account,
            index,
            recipe,
            mint,
            ingredient_record,
            delegated_ingredient,
            authority,
            payer,
            system_program,
        ),
    }
}
