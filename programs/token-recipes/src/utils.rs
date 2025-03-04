use solana_program::{
    account_info::AccountInfo,
    entrypoint::ProgramResult,
    program::{invoke, invoke_signed},
    program_error::ProgramError,
    pubkey::Pubkey,
    rent::Rent,
    system_instruction,
    sysvar::Sysvar,
};
use spl_token::instruction::{set_authority, AuthorityType};

use crate::error::TokenRecipesError;

/// Create a new account from the given size.
#[inline(always)]
pub fn create_account<'a>(
    target_account: &AccountInfo<'a>,
    funding_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    size: usize,
    owner: &Pubkey,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> ProgramResult {
    let rent = Rent::get()?;
    let lamports: u64 = rent.minimum_balance(size);

    invoke_signed(
        &system_instruction::create_account(
            funding_account.key,
            target_account.key,
            lamports,
            size as u64,
            owner,
        ),
        &[
            funding_account.clone(),
            target_account.clone(),
            system_program.clone(),
        ],
        signer_seeds.unwrap_or(&[]),
    )
}

/// Resize an account using realloc, lifted from Solana Cookbook.
#[inline(always)]
pub fn realloc_account<'a>(
    target_account: &AccountInfo<'a>,
    funding_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    new_size: usize,
    refund: bool,
) -> ProgramResult {
    let rent = Rent::get()?;
    let old_minimum_balance = rent.minimum_balance(target_account.data_len());
    let new_minimum_balance = rent.minimum_balance(new_size);
    let lamports_diff = new_minimum_balance.abs_diff(old_minimum_balance);

    if new_minimum_balance > old_minimum_balance {
        invoke(
            &system_instruction::transfer(funding_account.key, target_account.key, lamports_diff),
            &[
                funding_account.clone(),
                target_account.clone(),
                system_program.clone(),
            ],
        )?;
    } else if refund {
        transfer_lamports_from_pdas(target_account, funding_account, lamports_diff)?;
    }

    target_account.realloc(new_size, false)
}

/// Close an account.
#[inline(always)]
pub fn close_account<'a>(
    target_account: &AccountInfo<'a>,
    receiving_account: &AccountInfo<'a>,
) -> ProgramResult {
    let dest_starting_lamports = receiving_account.lamports();
    **receiving_account.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(target_account.lamports())
        .unwrap();
    **target_account.lamports.borrow_mut() = 0;

    let mut src_data = target_account.data.borrow_mut();
    src_data.fill(0);

    Ok(())
}

/// Transfer lamports.
#[inline(always)]
pub fn transfer_lamports<'a>(
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    lamports: u64,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> ProgramResult {
    invoke_signed(
        &system_instruction::transfer(from.key, to.key, lamports),
        &[from.clone(), to.clone()],
        signer_seeds.unwrap_or(&[]),
    )
}

pub fn transfer_lamports_from_pdas<'a>(
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    lamports: u64,
) -> ProgramResult {
    **from.lamports.borrow_mut() = from
        .lamports()
        .checked_sub(lamports)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    **to.lamports.borrow_mut() = to
        .lamports()
        .checked_add(lamports)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    Ok(())
}

/// Transfer mint authority.
#[inline(always)]
pub fn transfer_mint_authority<'a>(
    mint: &AccountInfo<'a>,
    from: &AccountInfo<'a>,
    to: &AccountInfo<'a>,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> ProgramResult {
    invoke_signed(
        &set_authority(
            &spl_token::id(),
            mint.key,
            Some(to.key),
            AuthorityType::MintTokens,
            from.key,
            &[],
        )?,
        &[mint.clone(), from.clone()],
        signer_seeds.unwrap_or(&[]),
    )
}

/// Create an associated token account.
#[inline(always)]
pub fn create_associated_token_account<'a>(
    token_account: &AccountInfo<'a>,
    mint_account: &AccountInfo<'a>,
    owner_account: &AccountInfo<'a>,
    payer_account: &AccountInfo<'a>,
) -> ProgramResult {
    invoke(
        &spl_associated_token_account::instruction::create_associated_token_account(
            payer_account.key,
            owner_account.key,
            mint_account.key,
            &spl_token::id(),
        ),
        &[
            payer_account.clone(),
            owner_account.clone(),
            mint_account.clone(),
            token_account.clone(),
        ],
    )
}

/// Burn tokens.
#[inline(always)]
pub fn burn_tokens<'a>(
    token_account: &AccountInfo<'a>,
    mint_account: &AccountInfo<'a>,
    owner_account: &AccountInfo<'a>,
    amount: u64,
    decimals: u8,
) -> ProgramResult {
    invoke(
        &spl_token::instruction::burn_checked(
            &spl_token::id(),
            token_account.key,
            mint_account.key,
            owner_account.key,
            &[],
            amount,
            decimals,
        )?,
        &[
            owner_account.clone(),
            mint_account.clone(),
            token_account.clone(),
        ],
    )
}

/// Mint tokens.
#[inline(always)]
pub fn mint_tokens<'a>(
    token_account: &AccountInfo<'a>,
    mint_account: &AccountInfo<'a>,
    mint_authority_account: &AccountInfo<'a>,
    amount: u64,
    decimals: u8,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> ProgramResult {
    invoke_signed(
        &spl_token::instruction::mint_to_checked(
            &spl_token::id(),
            mint_account.key,
            token_account.key,
            mint_authority_account.key,
            &[],
            amount,
            decimals,
        )?,
        &[
            mint_authority_account.clone(),
            mint_account.clone(),
            token_account.clone(),
        ],
        signer_seeds.unwrap_or(&[]),
    )
}

/// Transfer tokens.
#[inline(always)]
pub fn transfer_tokens<'a>(
    mint_account: &AccountInfo<'a>,
    from_owner_account: &AccountInfo<'a>,
    from_token_account: &AccountInfo<'a>,
    to_token_account: &AccountInfo<'a>,
    amount: u64,
    decimals: u8,
    signer_seeds: Option<&[&[&[u8]]]>,
) -> ProgramResult {
    invoke_signed(
        &spl_token::instruction::transfer_checked(
            &spl_token::id(),
            from_token_account.key,
            mint_account.key,
            to_token_account.key,
            from_owner_account.key,
            &[],
            amount,
            decimals,
        )?,
        &[
            from_owner_account.clone(),
            from_token_account.clone(),
            to_token_account.clone(),
            mint_account.clone(),
        ],
        signer_seeds.unwrap_or(&[]),
    )
}
