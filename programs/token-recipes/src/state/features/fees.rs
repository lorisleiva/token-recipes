use crate::{
    assertions::{
        assert_account_key, assert_mint_account, assert_pda, assert_program_owner,
        assert_same_pubkeys, assert_token_account, assert_writable,
    },
    error::TokenRecipesError,
    state::{features::UnlockFeatureContext, key::Key, recipe::Recipe},
    utils::{burn_tokens, mint_tokens, transfer_lamports},
};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankAccount;
use solana_program::{
    account_info::AccountInfo, entrypoint::ProgramResult, msg, program_error::ProgramError,
    pubkey::Pubkey, rent::Rent, sysvar::Sysvar,
};

/// Base fees for crafting.
/// 0.02 SOL.
pub const BASE_FEES: u64 = 20_000_000;

/// Unlocks recipe fees.
/// Aside from level 0, for every lamport that goes to the program admin, a shard is accumulated on the recipe.
/// Accumulated shards are automatically minted as a special ingredient when collecting fees.
///
/// - Level 0: 0% of base fees (see above) when crafting,
///            100% of base fees go to the program admin but no shards are accumulated.
/// - Level 1: 10% of base fees, 90% shards.
/// - Level 2: 20% of base fees, 80% shards.
/// - Level 3: 30% of base fees, 70% shards.
/// - Level 4: 40% of base fees, 60% shards.
/// - Level 5: 50% of base fees, 50% shards.
/// - Level 6: 60% of base fees, 40% shards.
/// - Level 7: 70% of base fees, 30% shards.
/// - Level 8: 80% of base fees, 20% shards.
/// - Level 9: 90% of base fees, 10% shards.
/// - Level 10: 90% of custom fees, 10% shards. If custom fees are set below base fees, no experience is gained on crafting.
/// - Level 11: 100% of custom fees. No shards nor experience are gained on crafting.
#[repr(C)]
#[derive(Clone, BorshSerialize, BorshDeserialize, Debug, ShankAccount)]
pub struct FeesFeature {
    /// Account discriminator.
    pub key: Key,
    /// The admin public key receiving the admin part of the fees.
    pub admin_destination: Pubkey,
    /// The mint used to mint shards. The mint authority must be set to the fees feature PDA.
    pub shard_mint: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 1.
    pub mint_burn_1: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 10.
    pub mint_burn_2: Pubkey,
    /// When burned, allows leveling up by 1 from 0 to 11.
    pub mint_burn_3: Pubkey,
    /// When burned, allows leveling up straight to 10.
    pub mint_burn_4: Pubkey,
    /// When burned, allows leveling up straight to 11.
    pub mint_burn_5: Pubkey,
    /// Without burning, allows leveling up straight to 1.
    pub mint_skill_1: Pubkey,
    /// Without burning, allows leveling up straight to 10.
    pub mint_skill_2: Pubkey,
    /// Without burning, allows leveling up straight to 11.
    pub mint_skill_3: Pubkey,
}

impl FeesFeature {
    pub const LEN: usize = 1 + 32 * 10;
    pub const MAX_LEVEL: u8 = 11;

    pub fn unlock(&self, context: &UnlockFeatureContext) -> ProgramResult {
        let mut recipe_account = Recipe::get_writable(context.recipe)?;
        let level = recipe_account.feature_levels.fees;
        if level >= Self::MAX_LEVEL {
            return Err(TokenRecipesError::MaxFeatureLevelReached.into());
        }

        let result: Result<u64, ProgramError> = match context.mint.key {
            x if *x == self.mint_burn_1 && level < 1 => {
                recipe_account.feature_levels.fees += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_2 && level < 10 => {
                recipe_account.feature_levels.fees += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_3 && level < 11 => {
                recipe_account.feature_levels.fees += 1;
                Ok(1)
            }
            x if *x == self.mint_burn_4 && level < 10 => {
                recipe_account.feature_levels.fees = 10;
                Ok(1)
            }
            x if *x == self.mint_burn_5 && level < 11 => {
                recipe_account.feature_levels.fees = 11;
                Ok(1)
            }
            x if *x == self.mint_skill_1 && level < 1 => {
                recipe_account.feature_levels.fees = 1;
                Ok(0)
            }
            x if *x == self.mint_skill_2 && level < 10 => {
                recipe_account.feature_levels.fees = 10;
                Ok(0)
            }
            x if *x == self.mint_skill_3 && level < 11 => {
                recipe_account.feature_levels.fees = 11;
                Ok(0)
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

        // If level 10 is reached for the first time, set custom fees to base fees.
        if level < 10 && recipe_account.feature_levels.fees >= 10 {
            recipe_account.fees = BASE_FEES;
        }

        recipe_account.save(context.recipe)
    }

    pub fn seeds<'a>() -> Vec<&'a [u8]> {
        vec!["features".as_bytes(), "fees".as_bytes()]
    }

    pub fn get(fees_feature_pda: &AccountInfo) -> Result<Self, ProgramError> {
        assert_program_owner("fees_feature_pda", fees_feature_pda, &crate::id())?;
        assert_account_key("fees_feature_pda", fees_feature_pda, Key::FeesFeature)?;
        Self::load(fees_feature_pda)
    }

    pub fn load(account: &AccountInfo) -> Result<Self, ProgramError> {
        let mut bytes: &[u8] = &(*account.data).borrow();
        FeesFeature::deserialize(&mut bytes).map_err(|error| {
            msg!("Error deserializing FeesFeature account: {}", error);
            TokenRecipesError::DeserializationError.into()
        })
    }

    pub fn save(&self, account: &AccountInfo) -> ProgramResult {
        let mut bytes = Vec::with_capacity(account.data_len());
        self.serialize(&mut bytes).map_err(|error| {
            msg!("Error serializing FeesFeature account: {}", error);
            TokenRecipesError::SerializationError
        })?;
        account.try_borrow_mut_data().unwrap()[..bytes.len()].copy_from_slice(&bytes);
        Ok(())
    }
}

/// Returns the total fees, admin fees and shards per craft.
/// Returns (total fees, admin fees, shards).
pub fn get_fees_and_shards_per_craft(recipe: &Recipe) -> Result<(u64, u64, u64), ProgramError> {
    let fee_percent: u64 = match recipe.feature_levels.fees {
        1 => 10,
        2 => 20,
        3 => 30,
        4 => 40,
        5 => 50,
        6 => 60,
        7 => 70,
        8 => 80,
        9 => 90,
        10 => 90,
        11 => 100,
        _ => 0, // Level 0.
    };

    let total_fees: u64 = match recipe.feature_levels.fees {
        10 | 11 => recipe.fees,
        _ => BASE_FEES,
    };

    let recipe_fees = total_fees
        .checked_mul(fee_percent)
        .and_then(|result| result.checked_div(100))
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    let admin_fees = total_fees
        .checked_sub(recipe_fees)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    let shards = match recipe.feature_levels.fees {
        0 => 0,
        _ if total_fees < BASE_FEES => 0,
        _ => admin_fees,
    };

    Ok((total_fees, admin_fees, shards))
}

/// Asserts that the recipe can set custom fees.
pub fn asserts_can_set_fees(recipe: &Recipe) -> ProgramResult {
    let level = recipe.feature_levels.fees;
    if level < 10 {
        msg!(
            "You cannot set custom fees for this recipe. Level up the \"Fees\" feature to level 10 to enable this feature.",
        );
        Err(TokenRecipesError::InvalidFeesFeature.into())
    } else {
        Ok(())
    }
}

pub fn collect_fees<'a>(
    accumulated_admin_fees: u64,
    expected_admin_fees_destination: &Pubkey,
    base: &Pubkey,
    recipe: &'a AccountInfo<'a>,
    authority: &'a AccountInfo<'a>,
    admin_fees_destination: &'a AccountInfo<'a>,
) -> ProgramResult {
    msg!("Collecting fees...");

    // Rent.
    let rent = Rent::get()?;
    let rent_exempt_reserve = rent.minimum_balance(recipe.data_len());

    // Recipe lamports.
    let recipe_lamports = recipe.lamports();
    let recipe_lamports_minus_rent =
        recipe_lamports
            .checked_sub(rent_exempt_reserve)
            .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    // Fees.
    let authority_fees = recipe_lamports_minus_rent
        .checked_sub(accumulated_admin_fees)
        .ok_or::<ProgramError>(TokenRecipesError::NumericalOverflow.into())?;

    // Prepare seeds.
    let mut seeds = Recipe::seeds(base);
    let bump = assert_pda("recipe", recipe, &crate::id(), &Recipe::seeds(base))?;
    let bump = &[bump];
    seeds.push(bump);

    // Transfer to the recipe authority.
    transfer_lamports(recipe, authority, authority_fees, Some(&[&seeds]))?;

    // Transfer to the admin destination.
    assert_writable("admin_fees_destination", admin_fees_destination)?;
    assert_same_pubkeys(
        "admin_fees_destination",
        admin_fees_destination,
        &expected_admin_fees_destination,
    )?;
    transfer_lamports(
        recipe,
        admin_fees_destination,
        accumulated_admin_fees,
        Some(&[&seeds]),
    )
}

pub fn collect_shards<'a>(
    accumulated_shards: u64,
    expected_shards_mint: &Pubkey,
    authority: &'a AccountInfo<'a>,
    shards_mint: &'a AccountInfo<'a>,
    shards_token: &'a AccountInfo<'a>,
    fees_feature_pda: &'a AccountInfo<'a>,
) -> ProgramResult {
    msg!("Collecting shards...");

    // Check: fees_feature_pda.
    let bump = assert_pda(
        "fees_feature_pda",
        fees_feature_pda,
        &crate::id(),
        &FeesFeature::seeds(),
    )?;

    // Check: shards_mint
    assert_same_pubkeys("shards_mint", shards_mint, &expected_shards_mint)?;
    assert_writable("shards_mint", shards_mint)?;
    let shards_mint_account = assert_mint_account("shards_mint", shards_mint)?;

    // Check: shards_token.
    assert_writable("shards_token", shards_token)?;
    let shards_token_account = assert_token_account("shards_token", shards_token)?;
    assert_same_pubkeys("shards_mint", shards_mint, &shards_token_account.mint)?;
    assert_same_pubkeys("authority", authority, &shards_token_account.owner)?;

    // Mint shards.
    let mut seeds = FeesFeature::seeds();
    let bump = &[bump];
    seeds.push(bump);
    mint_tokens(
        shards_token,
        shards_mint,
        fees_feature_pda,
        accumulated_shards,
        shards_mint_account.decimals,
        Some(&[&seeds]),
    )
}
