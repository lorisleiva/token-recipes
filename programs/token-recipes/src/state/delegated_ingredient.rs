use crate::{
    assertions::{
        assert_account_key, assert_empty, assert_mint_authority, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_writable,
    },
    error::TokenRecipesError,
    state::key::Key,
    utils::{close_account, create_account, transfer_mint_authority},
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    program_pack::Pack, pubkey::Pubkey,
};
use spl_token::state::Mint;

#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct DelegatedIngredient {
    pub key: Key,
    pub mint: Pubkey,
    pub authority: Pubkey,
    pub counter: u32,
}

impl DelegatedIngredient {
    pub const LEN: usize = 1 + 32 + 32 + 4;

    pub fn should_be_closed(&mut self) -> bool {
        self.counter == 0
    }

    pub fn seeds(mint: &Pubkey) -> Vec<&[u8]> {
        vec!["delegated_ingredient".as_bytes(), mint.as_ref()]
    }

    pub fn create<'a>(
        delegated_ingredient: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> Result<Self, ProgramError> {
        assert_empty("delegated_ingredient", delegated_ingredient)?;
        assert_writable("delegated_ingredient", delegated_ingredient)?;
        assert_pda(
            "delegated_ingredient",
            delegated_ingredient,
            &crate::id(),
            &Self::seeds(mint.key),
        )?;

        // Check: mint authority.
        let mint_account = Mint::unpack(&mint.data.borrow())?;
        assert_mint_authority("mint", mint, &mint_account, authority.key)?;

        let mut seeds = Self::seeds(mint.key);
        let (_, bump) = Pubkey::find_program_address(&seeds, &crate::id());
        let bump = [bump];
        seeds.push(&bump);
        create_account(
            delegated_ingredient,
            payer,
            system_program,
            Self::LEN,
            &crate::id(),
            Some(&[&seeds]),
        )?;
        transfer_mint_authority(mint, authority, delegated_ingredient, None)?;
        Ok(Self {
            key: Key::DelegatedIngredient,
            mint: *mint.key,
            authority: *authority.key,
            counter: 0,
        })
    }

    pub fn get<'a>(
        delegated_ingredient: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
    ) -> Result<Self, ProgramError> {
        assert_writable("delegated_ingredient", delegated_ingredient)?;
        assert_pda(
            "delegated_ingredient",
            delegated_ingredient,
            &crate::id(),
            &Self::seeds(mint.key),
        )?;
        assert_program_owner("delegated_ingredient", delegated_ingredient, &crate::id())?;
        assert_account_key(
            "delegated_ingredient",
            delegated_ingredient,
            Key::DelegatedIngredient,
        )?;
        let delegated_ingredient_account = Self::load(delegated_ingredient)?;
        assert_same_pubkeys("mint", mint, &delegated_ingredient_account.mint)?;
        assert_same_pubkeys(
            "authority",
            authority,
            &delegated_ingredient_account.authority,
        )?;
        Ok(delegated_ingredient_account)
    }

    pub fn get_or_create<'a>(
        delegated_ingredient: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> Result<Self, ProgramError> {
        match delegated_ingredient.data_is_empty() {
            true => Self::create(delegated_ingredient, mint, authority, payer, system_program),
            false => Self::get(delegated_ingredient, mint, authority),
        }
    }

    pub fn save_or_close<'a>(
        &mut self,
        delegated_ingredient: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
    ) -> ProgramResult {
        match self.should_be_closed() {
            true => {
                let mut seeds = Self::seeds(mint.key);
                let (_, bump) = Pubkey::find_program_address(&seeds, &crate::id());
                let bump = [bump];
                seeds.push(&bump);
                transfer_mint_authority(mint, delegated_ingredient, authority, Some(&[&seeds]))?;
                close_account(delegated_ingredient, payer)
            }
            false => self.save(delegated_ingredient),
        }
    }

    pub fn create_or_increment<'a>(
        delegated_ingredient: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system_program: &AccountInfo<'a>,
    ) -> ProgramResult {
        let mut delegated_ingredient_account =
            Self::get_or_create(delegated_ingredient, mint, authority, payer, system_program)?;
        delegated_ingredient_account.counter += 1;
        delegated_ingredient_account.save(delegated_ingredient)
    }

    pub fn close_or_decrement<'a>(
        delegated_ingredient: &AccountInfo<'a>,
        mint: &AccountInfo<'a>,
        authority: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
    ) -> ProgramResult {
        let mut delegated_ingredient_account = Self::get(delegated_ingredient, mint, authority)?;
        delegated_ingredient_account.counter -= 1;
        delegated_ingredient_account.save_or_close(delegated_ingredient, mint, authority, payer)
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        DelegatedIngredient::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing DelegatedIngredient account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing DelegatedIngredient account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}
