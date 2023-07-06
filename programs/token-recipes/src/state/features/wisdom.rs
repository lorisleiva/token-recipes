use crate::{
    assertions::{
        assert_account_key, assert_mint_account, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_token_account_or_create_ata, assert_writable,
    },
    error::TokenRecipesError,
    state::{
        features::{fees::BASE_FEES, UnlockFeatureContext},
        key::Key,
        recipe::Recipe,
    },
    utils::{burn_tokens, mint_tokens},
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey,
};

/// Unlocks more experience when crafting.
///
/// - Level 0: 100 experience points per craft.
/// - Level 1: 125 experience points per craft.
/// - Level 2: 150 experience points per craft.
/// - Level 3: 175 experience points per craft.
/// - Level 4: 200 experience points per craft.
/// - Level 5: 250 experience points per craft.
/// - Level 6: 300 experience points per craft.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct WisdomFeature {
    /// Account discriminator.
    pub key: Key,
    /// The mint used to mint shards. The mint authority must be set to the wisdom feature PDA.
    pub experience_mint: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 4.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 6.
    pub mint_burn_2: Pubkey,
}

impl WisdomFeature {
    pub const LEN: usize = 1 + 32 * 3;
    pub const MAX_LEVEL: u8 = 6;

    pub fn unlock(&self, context: &UnlockFeatureContext) -> ProgramResult {
        let mut recipe_account = Recipe::get_writable(context.recipe)?;
        let level = recipe_account.feature_levels.wisdom;
        if level >= Self::MAX_LEVEL {
            return Err(TokenRecipesError::MaxFeatureLevelReached.into());
        }

        let result: Result<u64, ProgramError> = match context.mint.key {
            x if *x == self.mint_burn_1 && level < 4 => {
                recipe_account.feature_levels.wisdom += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_2 && level < 6 => {
                recipe_account.feature_levels.wisdom += 1;
                Ok(1)
            }
            _ => Err(TokenRecipesError::InvalidMintToLevelUpFeature.into()),
        };
        let tokens_to_burn = result?;

        if tokens_to_burn > 0 {
            let mint_account = assert_mint_account("mint", context.mint)?;
            burn_tokens(
                context.token,
                context.mint,
                context.owner,
                tokens_to_burn,
                mint_account.decimals,
            )?;
        }

        recipe_account.save(context.recipe)
    }

    pub fn seeds<'a>() -> Vec<&'a [u8]> {
        vec!["features".as_bytes(), "wisdom".as_bytes()]
    }

    pub fn get(wisdom_feature_pda: &AccountInfo) -> Result<Self, ProgramError> {
        assert_program_owner("wisdom_feature_pda", wisdom_feature_pda, &crate::id())?;
        assert_account_key("wisdom_feature_pda", wisdom_feature_pda, Key::WisdomFeature)?;
        Self::load(wisdom_feature_pda)
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        WisdomFeature::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing Wisdom account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing Wisdom account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

pub fn get_experience_per_craft(recipe: &Recipe) -> u64 {
    if recipe.feature_levels.fees == 10 && recipe.fees < BASE_FEES {
        return 0;
    }
    if recipe.feature_levels.fees == 11 {
        return 0;
    }
    match recipe.feature_levels.wisdom {
        1 => 125,
        2 => 150,
        3 => 175,
        4 => 200,
        5 => 250,
        6 => 300,
        _ => 100, // Level 0.
    }
}

pub fn collect_experience<'a>(
    accumulated_experience: u64,
    expected_experience_mint: &Pubkey,
    authority: &'a AccountInfo<'a>,
    experience_mint: &'a AccountInfo<'a>,
    experience_token: &'a AccountInfo<'a>,
    wisdom_feature_pda: &'a AccountInfo<'a>,
    payer: &'a AccountInfo<'a>,
) -> ProgramResult {
    msg!("Collecting experience...");

    // Check: wisdom_feature_pda.
    let bump = assert_pda(
        "wisdom_feature_pda",
        wisdom_feature_pda,
        &crate::id(),
        &WisdomFeature::seeds(),
    )?;

    // Check: experience_mint
    assert_same_pubkeys(
        "experience_mint",
        experience_mint,
        &expected_experience_mint,
    )?;
    assert_writable("experience_mint", experience_mint)?;
    let experience_mint_account = assert_mint_account("experience_mint", experience_mint)?;

    // Check: experience_token.
    assert_token_account_or_create_ata(
        "experience_token",
        experience_token,
        "experience_mint",
        experience_mint,
        "authority",
        authority,
        payer,
    )?;

    // Mint experience.
    let mut seeds = WisdomFeature::seeds();
    let bump = &[bump];
    seeds.push(bump);
    mint_tokens(
        experience_token,
        experience_mint,
        wisdom_feature_pda,
        accumulated_experience,
        experience_mint_account.decimals,
        Some(&[&seeds]),
    )
}
