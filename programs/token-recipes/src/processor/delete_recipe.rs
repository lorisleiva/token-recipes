use crate::{
    assertions::{assert_same_pubkeys, assert_signer, assert_writable},
    error::TokenRecipesError,
    state::{
        features::{
            fees::{collect_fees, collect_shards, FeesFeature},
            wisdom::{collect_experience, WisdomFeature},
        },
        recipe::Recipe,
    },
    utils::close_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    system_program,
};

pub(crate) fn delete_recipe<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let admin_fees_destination = next_account_info(account_info_iter)?;
    let fees_feature_pda = next_account_info(account_info_iter)?;
    let shards_mint = next_account_info(account_info_iter)?;
    let shards_token = next_account_info(account_info_iter)?;
    let wisdom_feature_pda = next_account_info(account_info_iter)?;
    let experience_mint = next_account_info(account_info_iter)?;
    let experience_token = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Check: recipe.
    let recipe_account = Recipe::get_writable(recipe)?;
    assert_writable("authority", authority)?;
    recipe_account.assert_signer_authority(authority)?;
    if recipe_account.inputs.len() > 0 || recipe_account.outputs.len() > 0 {
        return Err(TokenRecipesError::RecipeMustBeEmptyBeforeItCanBeDeleted.into());
    }

    // Check: payer.
    assert_signer("payer", payer)?;

    // Check: programs.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Get the features content.
    let fees_feature_account = FeesFeature::get(fees_feature_pda)?;
    let wisdom_feature_account = WisdomFeature::get(wisdom_feature_pda)?;

    // Collect the lamports.
    collect_fees(
        recipe_account.accumulated_admin_fees,
        &fees_feature_account.admin_destination,
        &recipe_account.base,
        recipe,
        authority,
        admin_fees_destination,
    )?;

    // Collect the shards.
    collect_shards(
        recipe_account.accumulated_shards,
        &fees_feature_account.shard_mint,
        authority,
        shards_mint,
        shards_token,
        fees_feature_pda,
    )?;

    // Collect the experience.
    collect_experience(
        recipe_account.accumulated_experience,
        &wisdom_feature_account.experience_mint,
        authority,
        experience_mint,
        experience_token,
        wisdom_feature_pda,
    )?;

    // Delete the account.
    close_account(recipe, payer)
}
