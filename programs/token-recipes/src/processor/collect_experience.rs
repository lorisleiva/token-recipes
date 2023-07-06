use crate::{
    assertions::assert_same_pubkeys,
    state::{
        features::wisdom::{collect_experience as collect_experience_logic, WisdomFeature},
        recipe::Recipe,
    },
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn collect_experience<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let wisdom_feature_pda = next_account_info(account_info_iter)?;
    let experience_mint = next_account_info(account_info_iter)?;
    let experience_token = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Check: recipe and authority.
    let mut recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;

    // Check: programs.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    // Collect the experience.
    let wisdom_feature_account = WisdomFeature::get(wisdom_feature_pda)?;
    collect_experience_logic(
        recipe_account.accumulated_experience,
        &wisdom_feature_account.experience_mint,
        authority,
        experience_mint,
        experience_token,
        wisdom_feature_pda,
    )?;

    // Update the recipe.
    recipe_account.accumulated_experience = 0;
    recipe_account.save(recipe)
}
