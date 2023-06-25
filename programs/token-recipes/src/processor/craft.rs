use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_pda, assert_program_owner,
        assert_recipe_is_active, assert_same_pubkeys, assert_signer, assert_writable,
    },
    error::TokenRecipesError,
    state::{key::Key, recipe::Recipe},
    utils::{burn_tokens, create_associated_token_account},
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_pack::Pack,
    system_program,
};

pub(crate) fn craft(accounts: &[AccountInfo], quantity: u64) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let owner = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;
    let ata_program = next_account_info(account_info_iter)?;

    // Check: recipe.
    assert_program_owner("recipe", recipe, &crate::id())?;
    assert_account_key("recipe", recipe, Key::Recipe)?;
    let recipe_account = Recipe::load(recipe)?;
    assert_recipe_is_active(&recipe_account)?;

    // Check: owner.
    assert_signer("owner", owner)?;

    // Check: payer.
    assert_signer("payer", payer)?;
    assert_writable("payer", payer)?;

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Check: token_program.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Check: ata_program.
    assert_same_pubkeys(
        "ata_program",
        ata_program,
        &spl_associated_token_account::id(),
    )?;

    // Ingredient inputs.
    recipe_account
        .inputs
        .iter()
        .map(|input| -> ProgramResult {
            let input_mint = next_account_info(account_info_iter)?;
            let input_token = next_account_info(account_info_iter)?;

            // Check: ingredient mint.
            assert_writable("input_mint", input_mint)?;
            assert_program_owner("input_mint", input_mint, &spl_token::ID)?;
            assert_data_size("input_mint", input_mint, 82)?;
            let input_mint_account = spl_token::state::Mint::unpack(&input_mint.data.borrow())?;

            // Check: ingredient token.
            if input_token.data_is_empty() {
                assert_pda(
                    "input_token",
                    input_token,
                    &spl_token::ID,
                    &[
                        owner.key.as_ref(),
                        spl_token::id().as_ref(),
                        input_mint.key.as_ref(),
                    ],
                )?;
                create_associated_token_account(input_token, input_mint, owner, payer)?;
            } else {
                assert_writable("input_token", input_token)?;
                assert_program_owner("input_token", input_token, &spl_token::ID)?;
                assert_data_size("input_token", input_token, 165)?;
                let input_token_account =
                    spl_token::state::Account::unpack(&input_token.data.borrow())?;
                assert_same_pubkeys("input_mint", input_mint, &input_token_account.mint)?;
                assert_same_pubkeys("owner", owner, &input_token_account.owner)?;
            }

            // Compute the total amount of tokens required.
            // Throw a NumericalOverflow error if the amount overflows u64.
            let amount = input
                .amount
                .checked_mul(quantity)
                .ok_or(TokenRecipesError::NumericalOverflow)?;

            // Burn the ingredient token.
            // TODO: Transfer option.
            burn_tokens(
                input_token,
                input_mint,
                owner,
                amount,
                input_mint_account.decimals,
            )?;

            Ok(())
        })
        .collect::<ProgramResult>()?;

    // Ingredient outputs.
    // TODO

    Ok(())
}
