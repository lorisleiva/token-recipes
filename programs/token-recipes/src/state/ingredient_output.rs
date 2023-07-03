use crate::{
    assertions::{
        assert_account_key, assert_data_size, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_writable,
    },
    error::TokenRecipesError,
    state::{delegated_ingredient::DelegatedIngredient, key::Key},
    utils::{create_associated_token_account, mint_tokens},
};
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    program_error::ProgramError,
    program_pack::Pack,
    pubkey::Pubkey,
};
use spl_token::state::{Account, Mint};
use std::slice::Iter;

#[derive(BorshSerialize, BorshDeserialize, PartialEq, Eq, Debug, Clone)]
pub enum IngredientOutput {
    MintToken {
        mint: Pubkey,
        amount: u64,
    },
    MintTokenWithMaxSupply {
        mint: Pubkey,
        amount: u64,
        max_supply: u64,
    },
}

impl IngredientOutput {
    pub fn len(&self) -> usize {
        match self {
            IngredientOutput::MintToken { .. } => 32 + 8,
            IngredientOutput::MintTokenWithMaxSupply { .. } => 32 + 8 + 8,
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
            IngredientOutput::MintToken { mint, amount } => {
                let (
                    output_mint,
                    output_mint_account,
                    output_token,
                    delegated_ingredient,
                    delegated_ingredient_bump,
                    multipliedAmount,
                ) = next_output_mint_and_token(
                    account_info_iter,
                    owner,
                    payer,
                    quantity,
                    mint,
                    amount,
                )?;

                // Mint the ingredient token.
                let mut seeds = DelegatedIngredient::seeds(output_mint.key);
                let delegated_ingredient_bump = [delegated_ingredient_bump];
                seeds.push(&delegated_ingredient_bump);
                mint_tokens(
                    output_token,
                    output_mint,
                    delegated_ingredient,
                    multipliedAmount,
                    output_mint_account.decimals,
                    Some(&[&seeds]),
                )
            }
            IngredientOutput::MintTokenWithMaxSupply {
                mint,
                amount,
                max_supply,
            } => {
                let (
                    output_mint,
                    output_mint_account,
                    output_token,
                    delegated_ingredient,
                    delegated_ingredient_bump,
                    multipliedAmount,
                ) = next_output_mint_and_token(
                    account_info_iter,
                    owner,
                    payer,
                    quantity,
                    mint,
                    amount,
                )?;

                // Assert max supply is not exceeded.
                let new_supply = output_mint_account
                    .supply
                    .checked_add(multipliedAmount)
                    .ok_or(TokenRecipesError::NumericalOverflow)?;
                if new_supply > *max_supply {
                    return Err(TokenRecipesError::MaximumSupplyReached.into());
                }

                // Mint the ingredient token.
                let mut seeds = DelegatedIngredient::seeds(output_mint.key);
                let delegated_ingredient_bump = [delegated_ingredient_bump];
                seeds.push(&delegated_ingredient_bump);
                mint_tokens(
                    output_token,
                    output_mint,
                    delegated_ingredient,
                    multipliedAmount,
                    output_mint_account.decimals,
                    Some(&[&seeds]),
                )
            }
        }
    }
}

fn next_output_mint_and_token<'a>(
    account_info_iter: &'a mut Iter<'a, AccountInfo<'a>>,
    owner: &AccountInfo<'a>,
    payer: &AccountInfo<'a>,
    quantity: u64,
    mint: &Pubkey,
    amount: &u64,
) -> Result<
    (
        &'a AccountInfo<'a>,
        Mint,
        &'a AccountInfo<'a>,
        &'a AccountInfo<'a>,
        u8,
        u64,
    ),
    ProgramError,
> {
    let output_mint = next_account_info(account_info_iter)?;
    let output_token = next_account_info(account_info_iter)?;
    let delegated_ingredient = next_account_info(account_info_iter)?;

    // Check: delegated ingredient.
    assert_program_owner("delegated_ingredient", delegated_ingredient, &crate::id())?;
    assert_account_key(
        "delegated_ingredient",
        delegated_ingredient,
        Key::DelegatedIngredient,
    )?;
    let delegated_ingredient_bump = assert_pda(
        "delegated_ingredient",
        delegated_ingredient,
        &crate::id(),
        &DelegatedIngredient::seeds(output_mint.key),
    )?;

    // Check: ingredient mint.
    assert_same_pubkeys("output_mint", output_mint, mint)?;
    assert_writable("output_mint", output_mint)?;
    assert_program_owner("output_mint", output_mint, &spl_token::id())?;
    assert_data_size("output_mint", output_mint, 82)?;
    let output_mint_account = Mint::unpack(&output_mint.data.borrow())?;

    // Check: ingredient token.
    if output_token.data_is_empty() {
        assert_pda(
            "output_token",
            output_token,
            &spl_associated_token_account::id(),
            &[
                owner.key.as_ref(),
                spl_token::id().as_ref(),
                output_mint.key.as_ref(),
            ],
        )?;
        create_associated_token_account(output_token, output_mint, owner, payer)?;
    } else {
        assert_writable("output_token", output_token)?;
        assert_program_owner("output_token", output_token, &spl_token::id())?;
        assert_data_size("output_token", output_token, 165)?;
        let output_token_account = Account::unpack(&output_token.data.borrow())?;
        assert_same_pubkeys("output_mint", output_mint, &output_token_account.mint)?;
        assert_same_pubkeys("owner", owner, &output_token_account.owner)?;
    }

    // Compute the total amount of tokens required.
    let multipliedAmount = amount
        .checked_mul(quantity)
        .ok_or(TokenRecipesError::NumericalOverflow)?;

    Ok((
        output_mint,
        output_mint_account,
        output_token,
        delegated_ingredient,
        delegated_ingredient_bump,
        multipliedAmount,
    ))
}
