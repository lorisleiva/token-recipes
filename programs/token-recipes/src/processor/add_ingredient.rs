use crate::{
    assertions::{assert_account_key, assert_program_owner, assert_same_pubkeys, assert_signer},
    state::{
        key::Key,
        recipe::{IngredientInput, IngredientOutput, IngredientType, Recipe},
    },
    utils::realloc_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    system_program,
};

pub(crate) fn add_ingredient(
    accounts: &[AccountInfo],
    amount: u64,
    ingredient_type: IngredientType,
    max_supply: Option<u64>,
) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Guards.
    assert_program_owner("system_program", system_program, &system_program::id())?;
    assert_program_owner("recipe", recipe, &crate::id())?;
    assert_account_key("recipe", recipe, Key::Recipe)?;
    let mut recipe_account = Recipe::load(recipe)?;
    assert_same_pubkeys("authority", authority, &recipe_account.authority)?;
    assert_signer("authority", authority)?;

    // Find the new space for the recipe account.
    let space: usize = match ingredient_type {
        IngredientType::Input => recipe.data_len() + IngredientInput::LEN,
        IngredientType::Output => recipe.data_len() + IngredientOutput::LEN,
    };

    // Realloc the recipe account.
    realloc_account(recipe, payer, system_program, space)?;

    // Add the ingredient to the recipe account.
    match ingredient_type {
        IngredientType::Input => {
            recipe_account.inputs.push(IngredientInput {
                mint: *mint.key,
                amount,
            });
        }
        IngredientType::Output => recipe_account.outputs.push(IngredientOutput {
            mint: *mint.key,
            amount,
            max_supply: max_supply.unwrap_or(u64::MAX),
        }),
    }
    recipe_account.save(recipe)

    // TODO: Create the ingredient PDA.
    // TODO: Create the delegated ingredient PDA.
}
