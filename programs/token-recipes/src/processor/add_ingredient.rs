use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_mint_authority, assert_pda,
        assert_program_owner, assert_same_pubkeys, assert_signer, assert_writable,
    },
    state::{
        delegated_ingredient::DelegatedIngredient,
        ingredient_record::IngredientRecord,
        key::Key,
        recipe::{IngredientInput, IngredientOutput, IngredientType, Recipe},
    },
    utils::{create_account, realloc_account, transfer_mint_authority},
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    pubkey::Pubkey,
    system_program,
};
use spl_token::state::Mint;

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

    // Check: ingredient_record.
    assert_writable("ingredient_record", ingredient_record)?;
    let ingredient_record_bump = assert_pda(
        "ingredient_record",
        ingredient_record,
        &crate::id(),
        &IngredientRecord::seeds(mint.key, recipe.key),
    )?;

    // Realloc the recipe account.
    let space: usize = match ingredient_type {
        IngredientType::Input => recipe.data_len() + IngredientInput::LEN,
        IngredientType::Output => recipe.data_len() + IngredientOutput::LEN,
    };
    realloc_account(recipe, payer, system_program, space)?;

    // Add the ingredient to the recipe account.
    match ingredient_type {
        IngredientType::Input => recipe_account.add_ingredient_input(IngredientInput {
            mint: *mint.key,
            amount,
        }),
        IngredientType::Output => recipe_account.add_ingredient_output(IngredientOutput {
            mint: *mint.key,
            amount,
            max_supply: max_supply.unwrap_or(u64::MAX),
        }),
    };
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
        false => {
            assert_program_owner("ingredient_record", ingredient_record, &crate::id())?;
            assert_account_key(
                "ingredient_record",
                ingredient_record,
                Key::IngredientRecord,
            )?;
            let ingredient_record_account = IngredientRecord::load(ingredient_record)?;
            assert_same_pubkeys("recipe", recipe, &ingredient_record_account.recipe)?;
            assert_same_pubkeys("mint", mint, &ingredient_record_account.mint)?;
            ingredient_record_account
        }
    };

    // Update and save the ingredient record.
    match ingredient_type {
        IngredientType::Input => ingredient_record_account.set_input(true)?,
        IngredientType::Output => ingredient_record_account.set_output(true)?,
    }
    ingredient_record_account.save(ingredient_record)?;

    // Create or increment the delegated ingredient PDA for output ingredients.
    if matches!(ingredient_type, IngredientType::Output) {
        // Check: delegated_ingredient.
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

        let mut delegated_ingredient_account = match delegated_ingredient.data_is_empty() {
            true => {
                // Check: mint authority.
                let mint_account = Mint::unpack(&mint.data.borrow())?;
                assert_mint_authority("mint", mint, &mint_account, authority.key)?;

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
                transfer_mint_authority(
                    mint,
                    authority,
                    delegated_ingredient,
                    token_program,
                    None,
                )?;
                DelegatedIngredient {
                    key: Key::DelegatedIngredient,
                    mint: *mint.key,
                    authority: *authority.key,
                    counter: 0,
                }
            }
            false => {
                assert_program_owner("delegated_ingredient", delegated_ingredient, &crate::id())?;
                assert_account_key(
                    "delegated_ingredient",
                    delegated_ingredient,
                    Key::DelegatedIngredient,
                )?;
                let delegated_ingredient_account = DelegatedIngredient::load(delegated_ingredient)?;
                assert_same_pubkeys("mint", mint, &delegated_ingredient_account.mint)?;
                assert_same_pubkeys(
                    "authority",
                    authority,
                    &delegated_ingredient_account.authority,
                )?;
                delegated_ingredient_account
            }
        };
        delegated_ingredient_account.counter += 1;
        delegated_ingredient_account.save(delegated_ingredient)?;
    }

    Ok(())
}
