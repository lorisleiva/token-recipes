use std::slice::Iter;

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};
use spl_token::state::{Account, Mint};

use crate::{
    assertions::{
        assert_data_size, assert_enough_tokens, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_writable,
    },
    error::TokenRecipesError,
    utils::{burn_tokens, create_associated_token_account, transfer_tokens},
};

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum IngredientInput {
    BurnToken {
        mint: Pubkey,
        amount: u64,
    },
    TransferToken {
        mint: Pubkey,
        amount: u64,
        destination: Pubkey,
    },
}

impl IngredientInput {
    pub fn len(&self) -> usize {
        match self {
            IngredientInput::BurnToken { .. } => 32 + 8,
            IngredientInput::TransferToken { .. } => 32 + 8 + 32,
        }
    }

    pub fn craft(
        &self,
        account_info_iter: &mut Iter<AccountInfo>,
        owner: &AccountInfo,
        payer: &AccountInfo,
        quantity: u64,
    ) -> ProgramResult {
        match self {
            IngredientInput::BurnToken { mint, amount } => {
                let (input_mint, input_mint_account, input_token, multipliedAmount) =
                    next_input_mint_and_token(account_info_iter, owner, quantity, mint, amount)?;

                burn_tokens(
                    input_token,
                    input_mint,
                    owner,
                    multipliedAmount,
                    input_mint_account.decimals,
                )
            }
            IngredientInput::TransferToken {
                mint,
                amount,
                destination,
            } => {
                let (input_mint, input_mint_account, input_token, multipliedAmount) =
                    next_input_mint_and_token(account_info_iter, owner, quantity, mint, amount)?;

                let input_destination = next_account_info(account_info_iter)?;
                let input_destination_token = next_account_info(account_info_iter)?;

                // Check: input_destination.
                assert_same_pubkeys("input_destination", input_destination, &destination)?;

                // Check: input_destination_token.
                if input_destination_token.data_is_empty() {
                    assert_pda(
                        "input_destination_token",
                        input_destination_token,
                        &spl_associated_token_account::id(),
                        &[
                            input_destination.key.as_ref(),
                            spl_token::id().as_ref(),
                            input_mint.key.as_ref(),
                        ],
                    )?;
                    create_associated_token_account(
                        input_destination_token,
                        input_mint,
                        input_destination,
                        payer,
                    )?;
                } else {
                    assert_writable("input_destination_token", input_destination_token)?;
                    assert_program_owner(
                        "input_destination_token",
                        input_destination_token,
                        &spl_token::id(),
                    )?;
                    assert_data_size("input_destination_token", input_destination_token, 165)?;
                    let input_destination_token_account =
                        spl_token::state::Account::unpack(&input_destination_token.data.borrow())?;
                    assert_same_pubkeys(
                        "input_mint",
                        input_mint,
                        &input_destination_token_account.mint,
                    )?;
                    assert_same_pubkeys(
                        "input_destination",
                        input_destination,
                        &input_destination_token_account.owner,
                    )?;
                }

                transfer_tokens(
                    input_mint,
                    owner,
                    input_token,
                    input_destination_token,
                    multipliedAmount,
                    input_mint_account.decimals,
                    None,
                )
            }
        }
    }
}

fn next_input_mint_and_token<'a>(
    account_info_iter: &'a mut Iter<'a, AccountInfo<'a>>,
    owner: &AccountInfo<'a>,
    quantity: u64,
    mint: &Pubkey,
    amount: &u64,
) -> Result<(&'a AccountInfo<'a>, Mint, &'a AccountInfo<'a>, u64), ProgramError> {
    let input_mint = next_account_info(account_info_iter)?;
    let input_token = next_account_info(account_info_iter)?;

    // Check: ingredient mint.
    assert_same_pubkeys("input_mint", input_mint, mint)?;
    assert_writable("input_mint", input_mint)?;
    assert_program_owner("input_mint", input_mint, &spl_token::id())?;
    assert_data_size("input_mint", input_mint, 82)?;
    let input_mint_account = Mint::unpack(&input_mint.data.borrow())?;

    // Check: ingredient token.
    assert_writable("input_token", input_token)?;
    assert_program_owner("input_token", input_token, &spl_token::id())?;
    assert_data_size("input_token", input_token, 165)?;
    let input_token_account = Account::unpack(&input_token.data.borrow())?;
    assert_same_pubkeys("input_mint", input_mint, &input_token_account.mint)?;
    assert_same_pubkeys("owner", owner, &input_token_account.owner)?;

    // Compute the total amount of tokens required.
    let multipliedAmount = amount
        .checked_mul(quantity)
        .ok_or(TokenRecipesError::NumericalOverflow)?;
    assert_enough_tokens(
        "input_token",
        input_token,
        input_token_account,
        multipliedAmount,
    )?;

    Ok((
        input_mint,
        input_mint_account,
        input_token,
        multipliedAmount,
    ))
}
