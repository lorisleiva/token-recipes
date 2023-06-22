use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_empty, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_signer, assert_writable,
    },
    error::TokenRecipesError,
    state::{
        delegated_ingredient::DelegatedIngredient,
        ingredient_record::IngredientRecord,
        key::Key,
        recipe::{IngredientInput, IngredientOutput, IngredientType, Recipe},
    },
    utils::{create_account, realloc_account},
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    msg,
    program::invoke,
    pubkey::Pubkey,
    system_program,
};
use spl_token::instruction::{set_authority, AuthorityType};

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
    let ingredient_record = next_account_info(account_info_iter)?;
    let delegated_ingredient = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Check: recipe.
    assert_writable("recipe", recipe)?;
    assert_program_owner("recipe", recipe, &crate::id())?;
    assert_account_key("recipe", recipe, Key::Recipe)?;
    let mut recipe_account = Recipe::load(recipe)?;

    // Check: mint.
    assert_writable("mint", mint)?;
    assert_program_owner("mint", mint, &spl_token::ID)?;
    assert_data_size("mint", mint, 82)?; // 165 for token

    // Check: ingredient_record.
    assert_writable("ingredient_record", ingredient_record)?;
    assert_empty("ingredient_record", ingredient_record)?;
    let ingredient_record_bump = assert_pda(
        "ingredient_record",
        ingredient_record,
        &crate::id(),
        &IngredientRecord::seeds(mint.key, recipe.key),
    )?;
    if !ingredient_record.data_is_empty() {
        assert_program_owner("ingredient_record", ingredient_record, &crate::id())?;
        assert_account_key(
            "ingredient_record",
            ingredient_record,
            Key::IngredientRecord,
        )?;
    }

    // Check: delegated_ingredient.
    if matches!(ingredient_type, IngredientType::Output) {
        assert_writable("delegated_ingredient", delegated_ingredient)?;
        assert_pda(
            "delegated_ingredient",
            delegated_ingredient,
            &crate::id(),
            &DelegatedIngredient::seeds(mint.key),
        )?;
        if !delegated_ingredient.data_is_empty() {
            assert_program_owner("delegated_ingredient", delegated_ingredient, &crate::id())?;
            assert_account_key(
                "delegated_ingredient",
                delegated_ingredient,
                Key::DelegatedIngredient,
            )?;
        }
    }

    // Check: authority.
    assert_same_pubkeys("authority", authority, &recipe_account.authority)?;
    assert_signer("authority", authority)?;

    // Check: payer.
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Check: token_program.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Realloc the recipe account.
    let space: usize = match ingredient_type {
        IngredientType::Input => recipe.data_len() + IngredientInput::LEN,
        IngredientType::Output => recipe.data_len() + IngredientOutput::LEN,
    };
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
    recipe_account.save(recipe)?;

    // Create the ingredient PDA if it doesn't exist.
    let mut ingredient_record_account = match ingredient_record.data_is_empty() {
        true => {
            let mut seeds = IngredientRecord::seeds(mint.key, recipe.key);
            let bump = [ingredient_record_bump];
            seeds.push(&bump);
            create_account(
                ingredient_record,
                payer,
                system_program,
                IngredientRecord::LEN,
                &crate::id(),
                Some(&[&seeds]),
            )?;
            IngredientRecord {
                key: Key::IngredientRecord,
                input: false,
                output: false,
                mint: *mint.key,
                recipe: *recipe.key,
            }
        }
        false => IngredientRecord::load(ingredient_record)?,
    };

    // Ensure the ingredient isn't already part of the recipe.
    match (
        &ingredient_type,
        ingredient_record_account.input,
        ingredient_record_account.output,
    ) {
        (IngredientType::Input, true, _) => {
            msg!(
                "Ingredient [{}] is already part of this recipe as an input.",
                ingredient_record.key,
            );
            return Err(TokenRecipesError::IngredientAlreadyAdded.into());
        }
        (IngredientType::Output, _, true) => {
            msg!(
                "Ingredient [{}] is already part of this recipe as an output.",
                ingredient_record.key,
            );
            return Err(TokenRecipesError::IngredientAlreadyAdded.into());
        }
        _ => (),
    }

    // Update and save the ingredient record.
    match &ingredient_type {
        IngredientType::Input => ingredient_record_account.input = true,
        IngredientType::Output => ingredient_record_account.output = true,
    }
    ingredient_record_account.save(ingredient_record)?;

    // Create or increment the delegated ingredient PDA for output ingredients.
    if matches!(&ingredient_type, IngredientType::Output) {
        let mut delegated_ingredient_account = match delegated_ingredient.data_is_empty() {
            true => {
                let mut seeds = DelegatedIngredient::seeds(mint.key);
                let (_, bump) = Pubkey::find_program_address(&seeds, &crate::id());
                let bump = [bump];
                seeds.push(&bump);
                create_account(
                    delegated_ingredient,
                    payer,
                    system_program,
                    DelegatedIngredient::LEN,
                    &crate::id(),
                    Some(&[&seeds]),
                )?;
                invoke(
                    &set_authority(
                        token_program.key,
                        mint.key,
                        Some(delegated_ingredient.key),
                        AuthorityType::MintTokens,
                        authority.key,
                        &[],
                    )?,
                    &[mint.clone(), authority.clone()],
                )?;
                DelegatedIngredient {
                    key: Key::DelegatedIngredient,
                    mint: *mint.key,
                    authority: *authority.key,
                    counter: 0,
                }
            }
            false => DelegatedIngredient::load(delegated_ingredient)?,
        };
        delegated_ingredient_account.counter += 1;
        delegated_ingredient_account.save(delegated_ingredient)?;
    }

    Ok(())
}
