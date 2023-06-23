use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_signer, assert_writable,
    },
    state::{
        delegated_ingredient::DelegatedIngredient,
        ingredient_record::IngredientRecord,
        key::Key,
        recipe::{IngredientInput, IngredientOutput, IngredientType, Recipe},
    },
    utils::{close_account, realloc_account, transfer_mint_authority},
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    pubkey::Pubkey,
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

    // Check: mint.
    assert_writable("mint", mint)?;
    assert_program_owner("mint", mint, &spl_token::ID)?;
    assert_data_size("mint", mint, 82)?;

    // Check: ingredient_record.
    assert_writable("ingredient_record", ingredient_record)?;
    assert_program_owner("ingredient_record", ingredient_record, &crate::id())?;
    assert_account_key(
        "ingredient_record",
        ingredient_record,
        Key::IngredientRecord,
    )?;
    assert_pda(
        "ingredient_record",
        ingredient_record,
        &crate::id(),
        &IngredientRecord::seeds(mint.key, recipe.key),
    )?;
    let mut ingredient_record_account = IngredientRecord::load(ingredient_record)?;
    assert_same_pubkeys("recipe", recipe, &ingredient_record_account.recipe)?;
    assert_same_pubkeys("mint", mint, &ingredient_record_account.mint)?;

    // Realloc the recipe account.
    let space: usize = match ingredient_type {
        IngredientType::Input => recipe.data_len() - IngredientInput::LEN,
        IngredientType::Output => recipe.data_len() - IngredientOutput::LEN,
    };
    realloc_account(recipe, payer, system_program, space)?;

    // Remove the ingredient from the recipe account.
    match ingredient_type {
        IngredientType::Input => recipe_account.remove_ingredient_input(mint.key)?,
        IngredientType::Output => recipe_account.remove_ingredient_output(mint.key)?,
    }
    recipe_account.save(recipe)?;

    // Update and save the ingredient record.
    match ingredient_type {
        IngredientType::Input => ingredient_record_account.set_input(false)?,
        IngredientType::Output => ingredient_record_account.set_output(false)?,
    }

    // Remove the ingredient PDA if the ingredient is no longer in input nor output.
    match ingredient_record_account.should_be_closed() {
        true => close_account(ingredient_record, payer)?,
        false => ingredient_record_account.save(ingredient_record)?,
    };

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
        assert_program_owner("delegated_ingredient", delegated_ingredient, &crate::id())?;
        assert_account_key(
            "delegated_ingredient",
            delegated_ingredient,
            Key::DelegatedIngredient,
        )?;
        let mut delegated_ingredient_account = DelegatedIngredient::load(delegated_ingredient)?;
        assert_same_pubkeys("mint", mint, &delegated_ingredient_account.mint)?;
        assert_same_pubkeys(
            "authority",
            authority,
            &delegated_ingredient_account.authority,
        )?;

        // Decrement the counter.
        delegated_ingredient_account.counter -= 1;

        // Remove the delegated ingredient PDA and transfer back the mint authority if the counter is zero.
        match delegated_ingredient_account.should_be_closed() {
            true => {
                let mut seeds = DelegatedIngredient::seeds(mint.key);
                let (_, bump) = Pubkey::find_program_address(&seeds, &crate::id());
                let bump = [bump];
                seeds.push(&bump);
                transfer_mint_authority(
                    mint,
                    delegated_ingredient,
                    authority,
                    token_program,
                    Some(&[&seeds]),
                )?;
                close_account(delegated_ingredient, payer)?;
            }
            false => delegated_ingredient_account.save(delegated_ingredient)?,
        };
    }

    Ok(())
}
