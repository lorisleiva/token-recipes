use crate::{
    error::TokenRecipesError,
    state::{IngredientInput, IngredientOutput, IngredientType, Recipe},
    utils::realloc_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg, system_program,
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
    if *system_program.key != system_program::id() {
        msg!("Invalid system program account");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    if *recipe.owner != crate::id() {
        msg!("Recipe account must be owned by the token-recipes program");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    let mut recipe_account = Recipe::load(recipe)?;
    if recipe_account.authority != *authority.key {
        msg!("Recipe account must be owner by the provided authority");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }
    if !authority.is_signer {
        msg!("The recipe authority must sign the transaction");
        return Err(TokenRecipesError::InvalidInstructionAccount.into());
    }

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
