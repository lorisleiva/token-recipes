use crate::{
    assertions::{
        assert_account_key, assert_mint_account, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_token_account, assert_writable,
    },
    error::TokenRecipesError,
    state::{
        delegated_ingredient::DelegatedIngredient, ingredient_record::IngredientRecord, key::Key,
        recipe::Recipe,
    },
    utils::{create_associated_token_account, mint_tokens},
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
            Self::MintToken { .. } => 1 + 32 + 8,
            Self::MintTokenWithMaxSupply { .. } => 1 + 32 + 8 + 8,
        }
    }

    pub fn add<'a>(
        &self,
        recipe_account: &mut Recipe,
        recipe: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        ingredient_record: &AccountInfo<'a>,
        delegated_ingredient: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        match self {
            Self::MintToken { .. } | Self::MintTokenWithMaxSupply { .. } => {
                assert_writable("mint", mint)?;
                assert_mint_account("mint", mint)?;
                recipe_account.add_ingredient_output(&self, recipe, payer, system_program)?;
                let mut ingredient_record_account = IngredientRecord::get_or_create(
                    ingredient_record,
                    mint,
                    recipe,
                    payer,
                    system_program,
                )?;
                ingredient_record_account.set_output(true)?;
                ingredient_record_account.save(ingredient_record)?;
                DelegatedIngredient::create_or_increment(
                    delegated_ingredient,
                    mint,
                    authority,
                    payer,
                    system_program,
                )
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
        delegated_ingredient: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        match self {
            Self::MintToken { .. } | Self::MintTokenWithMaxSupply { .. } => {
                assert_writable("mint", mint)?;
                assert_mint_account("mint", mint)?;
                recipe_account.remove_ingredient_output(index, recipe, payer, system_program)?;
                let mut ingredient_record_account =
                    IngredientRecord::get(ingredient_record, mint, recipe)?;
                ingredient_record_account.set_output(false)?;
                ingredient_record_account.save_or_close(ingredient_record, payer)?;
                DelegatedIngredient::close_or_decrement(
                    delegated_ingredient,
                    mint,
                    authority,
                    payer,
                )
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
            Self::MintToken { mint, amount } => {
                let (
                    output_mint,
                    output_mint_account,
                    output_token,
                    delegated_ingredient,
                    delegated_ingredient_bump,
                    multiplied_amount,
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
                    multiplied_amount,
                    output_mint_account.decimals,
                    Some(&[&seeds]),
                )
            }
            Self::MintTokenWithMaxSupply {
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
                    multiplied_amount,
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
                    .checked_add(multiplied_amount)
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
                    multiplied_amount,
                    output_mint_account.decimals,
                    Some(&[&seeds]),
                )
            }
        }
    }
}

fn next_output_mint_and_token<'a, I: Iterator<Item = &'a AccountInfo<'a>>>(
    account_info_iter: &mut I,
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
    let output_mint_account = assert_mint_account("output_mint", output_mint)?;

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
        let output_token_account = assert_token_account("output_token", output_token)?;
        assert_same_pubkeys("output_mint", output_mint, &output_token_account.mint)?;
        assert_same_pubkeys("owner", owner, &output_token_account.owner)?;
    }

    // Compute the total amount of tokens required.
    let multiplied_amount = amount
        .checked_mul(quantity)
        .ok_or(TokenRecipesError::NumericalOverflow)?;

    Ok((
        output_mint,
        output_mint_account,
        output_token,
        delegated_ingredient,
        delegated_ingredient_bump,
        multiplied_amount,
    ))
}
