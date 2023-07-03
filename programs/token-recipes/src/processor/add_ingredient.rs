use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_program_owner, assert_same_pubkeys,
        assert_signer, assert_writable,
    },
    error::TokenRecipesError,
    state::{
        delegated_ingredient::DelegatedIngredient,
        ingredient_input::IngredientInput,
        ingredient_output::IngredientOutput,
        ingredient_record::IngredientRecord,
        key::Key,
        recipe::{IngredientType, Recipe},
    },
    utils::realloc_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
    system_program,
};

pub(crate) fn add_ingredient(
    accounts: &[AccountInfo],
    amount: u64,
    ingredient_type: IngredientType,
    destination: Option<Pubkey>,
    max_supply: Option<u64>,
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

    // Check: mint.
    assert_writable("mint", mint)?;
    assert_program_owner("mint", mint, &spl_token::id())?;
    assert_data_size("mint", mint, 82)?;

    // Check: amount
    if amount == 0 {
        return Err(TokenRecipesError::CannotAddIngredientWithZeroAmount.into());
    }

    // Add the ingredient to the recipe account and realloc.
    let new_size: usize = match ingredient_type {
        IngredientType::Input => {
            let ingredient = IngredientInput {
                mint: *mint.key,
                amount,
                destination,
            };
            recipe_account.add_ingredient_input(ingredient.clone());
            recipe.data_len() + ingredient.len()
        }
        IngredientType::Output => {
            let ingredient = IngredientOutput {
                mint: *mint.key,
                amount,
                max_supply: max_supply.unwrap_or(u64::MAX),
            };
            recipe_account.add_ingredient_output(ingredient.clone());
            recipe.data_len() + ingredient.len()
        }
    };
    realloc_account(recipe, payer, system_program, new_size)?;
    recipe_account.save(recipe)?;

    // Update or create the ingredient record.
    let mut ingredient_record_account =
        IngredientRecord::get_or_create(ingredient_record, mint, recipe, payer, system_program)?;
    match ingredient_type {
        IngredientType::Input => ingredient_record_account.set_input(true)?,
        IngredientType::Output => ingredient_record_account.set_output(true)?,
    }
    ingredient_record_account.save(ingredient_record)?;

    // Create or increment the delegated ingredient PDA for output ingredients.
    if matches!(ingredient_type, IngredientType::Output) {
        DelegatedIngredient::create_or_increment(
            delegated_ingredient,
            mint,
            authority,
            payer,
            system_program,
        )?;
    }

    Ok(())
}
