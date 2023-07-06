use crate::{
    assertions::{assert_same_pubkeys, assert_signer, assert_writable},
    state::{
        features::fees::{collect_fees as collect_fees_logic, collect_shards, FeesFeature},
        recipe::Recipe,
    },
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    system_program,
};

pub(crate) fn collect_fees<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let admin_fees_destination = next_account_info(account_info_iter)?;
    let fees_feature_pda = next_account_info(account_info_iter)?;
    let shards_mint = next_account_info(account_info_iter)?;
    let shards_token = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Check: recipe and authority.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;
    assert_writable("authority", authority)?;

    // Check: payer.
    assert_signer("payer", payer)?;
    assert_writable("payer", payer)?;

    // Check: programs.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Get the fees feature content.
    let fees_feature_account = FeesFeature::get(fees_feature_pda)?;

    // Collect the lamports.
    collect_fees_logic(
        recipe_account.accumulated_admin_fees,
        &fees_feature_account.admin_destination,
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
        payer,
    )?;

    // Update the recipe.
    recipe_account.accumulated_admin_fees = 0;
    recipe_account.accumulated_shards = 0;
    recipe_account.save(recipe)
}
