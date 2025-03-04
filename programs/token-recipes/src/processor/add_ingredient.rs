use crate::{
    assertions::{assert_same_pubkeys, assert_signer, assert_writable},
    error::TokenRecipesError,
    state::{
        features::{
            additional_outputs::assert_valid_additional_outputs,
            max_supply::assert_valid_max_supply_outputs,
            sol_payment::assert_valid_sol_payment_inputs,
            transfer_inputs::assert_valid_transfer_inputs,
        },
        ingredient_input::IngredientInput,
        ingredient_output::IngredientOutput,
        recipe::{Ingredient, IngredientType, Recipe},
    },
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

    // Check accounts.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Check: amount
    if amount == 0 {
        return Err(TokenRecipesError::CannotAddIngredientWithZeroAmount.into());
    }

    // Get ingredient from type.
    let ingredient: Ingredient = match ingredient_type {
        IngredientType::BurnTokenInput => Ingredient::Input(IngredientInput::BurnToken {
            mint: *mint.key,
            amount,
        }),
        IngredientType::TransferTokenInput => Ingredient::Input(IngredientInput::TransferToken {
            mint: *mint.key,
            amount,
            destination: destination.ok_or(TokenRecipesError::MissingDestinationArgument)?,
        }),
        IngredientType::TransferSolInput => Ingredient::Input(IngredientInput::TransferSol {
            lamports: amount,
            destination: destination.ok_or(TokenRecipesError::MissingDestinationArgument)?,
        }),
        IngredientType::MintTokenOutput => Ingredient::Output(IngredientOutput::MintToken {
            mint: *mint.key,
            amount,
        }),
        IngredientType::MintTokenWithMaxSupplyOutput => {
            Ingredient::Output(IngredientOutput::MintTokenWithMaxSupply {
                mint: *mint.key,
                amount,
                max_supply: max_supply.ok_or(TokenRecipesError::MissingMaxSupplyArgument)?,
            })
        }
    };

    // Add the ingredient.
    match ingredient {
        Ingredient::Input(input) => input.add(
            &mut recipe_account,
            recipe,
            mint,
            ingredient_record,
            payer,
            system_program,
        ),
        Ingredient::Output(output) => output.add(
            &mut recipe_account,
            recipe,
            mint,
            ingredient_record,
            delegated_ingredient,
            authority,
            payer,
            system_program,
        ),
    }?;

    // Check feature invariants.
    assert_valid_transfer_inputs(&recipe_account)?;
    assert_valid_sol_payment_inputs(&recipe_account)?;
    assert_valid_additional_outputs(&recipe_account)?;
    assert_valid_max_supply_outputs(&recipe_account)?;

    Ok(())
}
