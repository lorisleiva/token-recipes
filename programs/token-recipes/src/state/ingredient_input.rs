use crate::{
    assertions::{
        assert_enough_tokens, assert_mint_account, assert_pda, assert_same_pubkeys,
        assert_token_account, assert_writable,
    },
    error::TokenRecipesError,
    state::{ingredient_record::IngredientRecord, recipe::Recipe},
    utils::{burn_tokens, create_associated_token_account, transfer_tokens},
};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    pubkey::Pubkey,
};
use spl_token::state::Mint;

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
            Self::BurnToken { .. } => 1 + 32 + 8,
            Self::TransferToken { .. } => 1 + 32 + 8 + 32,
        }
    }

    pub fn add<'a>(
        &self,
        recipe_account: &mut Recipe,
        recipe: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        ingredient_record: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        match self {
            Self::BurnToken { .. } | Self::TransferToken { .. } => {
                recipe_account.add_ingredient_input(&self, recipe, payer, system_program)?;
                let mut ingredient_record_account = IngredientRecord::get_or_create(
                    ingredient_record,
                    mint,
                    recipe,
                    payer,
                    system_program,
                )?;
                ingredient_record_account.set_input(true)?;
                ingredient_record_account.save(ingredient_record)
            }
        }
    }

    pub fn remove<'a>(
        &self,
        recipe_account: &mut Recipe,
        index: usize,
        recipe: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        ingredient_record: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        match self {
            Self::BurnToken { .. } | Self::TransferToken { .. } => {
                recipe_account.remove_ingredient_input(index, recipe, payer, system_program)?;
                let mut ingredient_record_account =
                    IngredientRecord::get(ingredient_record, mint, recipe)?;
                ingredient_record_account.set_input(false)?;
                ingredient_record_account.save_or_close(ingredient_record, payer)
            }
        }
    }

    pub fn craft<'a, I: Iterator<Item = &'a AccountInfo<'a>>>(
        &self,
        account_info_iter: &mut I,
        owner: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        quantity: u64,
    ) -> ProgramResult {
        match self {
            Self::BurnToken { mint, amount } => {
                let (input_mint, input_mint_account, input_token, multiplied_amount) =
                    next_input_mint_and_token(account_info_iter, owner, quantity, mint, amount)?;

                burn_tokens(
                    input_token,
                    input_mint,
                    owner,
                    multiplied_amount,
                    input_mint_account.decimals,
                )
            }
            Self::TransferToken {
                mint,
                amount,
                destination,
            } => {
                let (input_mint, input_mint_account, input_token, multiplied_amount) =
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
                    let input_destination_token_account =
                        assert_token_account("input_destination_token", input_destination_token)?;
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
                    multiplied_amount,
                    input_mint_account.decimals,
                    None,
                )
            }
        }
    }
}

fn next_input_mint_and_token<'a, I: Iterator<Item = &'a AccountInfo<'a>>>(
    account_info_iter: &mut I,
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
    let input_mint_account = assert_mint_account("input_mint", input_mint)?;

    // Check: ingredient token.
    assert_writable("input_token", input_token)?;
    let input_token_account = assert_token_account("input_token", input_token)?;
    assert_same_pubkeys("input_mint", input_mint, &input_token_account.mint)?;
    assert_same_pubkeys("owner", owner, &input_token_account.owner)?;

    // Compute the total amount of tokens required.
    let multiplied_amount = amount
        .checked_mul(quantity)
        .ok_or(TokenRecipesError::NumericalOverflow)?;
    assert_enough_tokens(
        "input_token",
        input_token,
        input_token_account,
        multiplied_amount,
    )?;

    Ok((
        input_mint,
        input_mint_account,
        input_token,
        multiplied_amount,
    ))
}
