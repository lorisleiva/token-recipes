use crate::{error::TokenRecipesError, state::key::Key, utils::create_associated_token_account};
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    program_pack::Pack, pubkey::Pubkey,
};
use spl_token::state::{Account, Mint};

/// Assert that the given account is owned by the given program.
pub fn assert_program_owner(
    account_name: &str,
    account: &AccountInfo,
    owner: &Pubkey,
) -> ProgramResult {
    if account.owner != owner {
        msg!(
            "Account \"{}\" [{}] expected program owner [{}], got [{}]",
            account_name,
            account.key,
            owner,
            account.owner
        );
        Err(TokenRecipesError::InvalidProgramOwner.into())
    } else {
        Ok(())
    }
}

/// Assert the derivation of the seeds against the given account and return the bump seed.
pub fn assert_pda(
    account_name: &str,
    account: &AccountInfo,
    program_id: &Pubkey,
    seeds: &[&[u8]],
) -> Result<u8, ProgramError> {
    let (key, bump) = Pubkey::find_program_address(seeds, program_id);
    if *account.key != key {
        msg!(
            "Account \"{}\" [{}] is an invalid PDA. Expected the following valid PDA [{}]",
            account_name,
            account.key,
            key,
        );
        return Err(TokenRecipesError::InvalidPda.into());
    }
    Ok(bump)
}

/// Assert that the given account is empty.
pub fn assert_empty(account_name: &str, account: &AccountInfo) -> ProgramResult {
    if !account.data_is_empty() {
        msg!(
            "Account \"{}\" [{}] must be empty",
            account_name,
            account.key,
        );
        Err(TokenRecipesError::ExpectedEmptyAccount.into())
    } else {
        Ok(())
    }
}

/// Assert that the given account is a signer.
pub fn assert_signer(account_name: &str, account: &AccountInfo) -> ProgramResult {
    if !account.is_signer {
        msg!(
            "Account \"{}\" [{}] must be a signer",
            account_name,
            account.key,
        );
        Err(TokenRecipesError::ExpectedSignerAccount.into())
    } else {
        Ok(())
    }
}

/// Assert that the given account is writable.
pub fn assert_writable(account_name: &str, account: &AccountInfo) -> ProgramResult {
    if !account.is_writable {
        msg!(
            "Account \"{}\" [{}] must be writable",
            account_name,
            account.key,
        );
        Err(TokenRecipesError::ExpectedWritableAccount.into())
    } else {
        Ok(())
    }
}

/// Assert that the given account matches the given public key.
pub fn assert_same_pubkeys(
    account_name: &str,
    account: &AccountInfo,
    expected: &Pubkey,
) -> ProgramResult {
    if account.key != expected {
        msg!(
            "Account \"{}\" [{}] must match the following public key [{}]",
            account_name,
            account.key,
            expected
        );
        Err(TokenRecipesError::AccountMismatch.into())
    } else {
        Ok(())
    }
}

/// Assert that the given account has the expected data size.
pub fn assert_data_size(account_name: &str, account: &AccountInfo, size: usize) -> ProgramResult {
    if account.data_len() != size {
        msg!(
            "Account \"{}\" [{}] expected data size [{}], got [{}]",
            account_name,
            account.key,
            size,
            account.data_len()
        );
        Err(TokenRecipesError::InvalidDataSize.into())
    } else {
        Ok(())
    }
}

/// Assert that the given account has the expected account key.
pub fn assert_account_key(account_name: &str, account: &AccountInfo, key: Key) -> ProgramResult {
    if account.data_len() <= 1 || account.try_borrow_data()?[0] != key as u8 {
        msg!(
            "Account \"{}\" [{}] expected account key [{}], got [{}]",
            account_name,
            account.key,
            key as u8,
            account.try_borrow_data()?[0]
        );
        Err(TokenRecipesError::InvalidAccountKey.into())
    } else {
        Ok(())
    }
}

/// Assert that the given account matches the mint authority of the given mint account.
pub fn assert_mint_authority(
    account_name: &str,
    account: &AccountInfo,
    mint_account: &Mint,
    expected_mint_authority: &Pubkey,
) -> ProgramResult {
    if mint_account.mint_authority.is_none() {
        msg!(
            "Account \"{}\" [{}] does not have a mint authority. Expected [{}]",
            account_name,
            account.key,
            expected_mint_authority,
        );
        return Err(TokenRecipesError::InvalidMintAuthority.into());
    }

    if mint_account.mint_authority.unwrap() != *expected_mint_authority {
        msg!(
            "Account \"{}\" [{}] does not have a valid mint authority. Expected [{}], got [{}]",
            account_name,
            account.key,
            expected_mint_authority,
            mint_account.mint_authority.unwrap(),
        );
        return Err(TokenRecipesError::InvalidMintAuthority.into());
    }

    Ok(())
}

/// Assert that the given token account has enough tokens.
pub fn assert_enough_tokens(
    account_name: &str,
    account: &AccountInfo,
    token_account: Account,
    expected_amount: u64,
) -> ProgramResult {
    if token_account.amount < expected_amount {
        msg!(
            "Account \"{}\" [{}] expected to have at least [{}] tokens, got [{}]",
            account_name,
            account.key,
            expected_amount,
            token_account.amount
        );
        Err(TokenRecipesError::NotEnoughTokens.into())
    } else {
        Ok(())
    }
}

/// Assert that a given account is a mint account.
pub fn assert_mint_account(
    account_name: &str,
    account: &AccountInfo,
) -> Result<Mint, ProgramError> {
    assert_program_owner(account_name, account, &spl_token::id())?;
    assert_data_size(account_name, account, 82)?;
    Mint::unpack(&account.data.borrow())
}

/// Assert that a given account is a token account.
pub fn assert_token_account(
    account_name: &str,
    account: &AccountInfo,
) -> Result<Account, ProgramError> {
    assert_program_owner(account_name, account, &spl_token::id())?;
    assert_data_size(account_name, account, 165)?;
    Account::unpack(&account.data.borrow())
}

/// Assert that a given account is a token account
/// or create a new one if it is an associated token account.
pub fn assert_token_account_or_create_ata<'a>(
    account_name: &str,
    account: &'a AccountInfo<'a>,
    mint_name: &str,
    mint: &'a AccountInfo<'a>,
    owner_name: &str,
    owner: &'a AccountInfo<'a>,
    payer: &'a AccountInfo<'a>,
) -> ProgramResult {
    assert_writable(account_name, account)?;
    if account.data_is_empty() {
        assert_pda(
            account_name,
            account,
            &spl_associated_token_account::id(),
            &[
                owner.key.as_ref(),
                spl_token::id().as_ref(),
                mint.key.as_ref(),
            ],
        )?;
        create_associated_token_account(account, mint, owner, payer)
    } else {
        let parsed_account = assert_token_account(account_name, account)?;
        assert_same_pubkeys(mint_name, mint, &parsed_account.mint)?;
        assert_same_pubkeys(owner_name, owner, &parsed_account.owner)
    }
}
