use crate::{
    assertions::{assert_mint_account, assert_same_pubkeys, assert_signer, assert_writable},
    error::TokenRecipesError,
    state::{
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

    // Check: mint.
    assert_writable("mint", mint)?;
    assert_mint_account("mint", mint)?;

    // Check: amount
    if amount == 0 {
        return Err(TokenRecipesError::CannotAddIngredientWithZeroAmount.into());
    }

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
    }
}
