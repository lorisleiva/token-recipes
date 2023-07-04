use crate::{
    assertions::{
        assert_enough_tokens, assert_mint_account, assert_program_owner, assert_same_pubkeys,
        assert_signer, assert_token_account, assert_writable,
    },
    state::{
        features::{Feature, UnlockFeatureContext},
        recipe::Recipe,
    },
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn unlock_feature<'a>(accounts: &'a [AccountInfo<'a>]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let recipe = next_account_info(account_info_iter)?;
    let feature_pda = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let owner = next_account_info(account_info_iter)?;
    let mint = next_account_info(account_info_iter)?;
    let token = next_account_info(account_info_iter)?;
    let token_program = next_account_info(account_info_iter)?;

    // Check: recipe and authority.
    let recipe_account = Recipe::get_writable(recipe)?;
    recipe_account.assert_signer_authority(authority)?;

    // Check: feature_pda.
    assert_program_owner("feature_pda", feature_pda, &crate::id())?;
    let feature_account = Feature::load(feature_pda)?;

    // Check: owner, mint and token.
    assert_signer("owner", owner)?;
    assert_writable("mint", mint)?;
    assert_mint_account("mint", mint)?;
    assert_writable("token", token)?;
    let token_account = assert_token_account("token", token)?;
    assert_same_pubkeys("mint", mint, &token_account.mint)?;
    assert_same_pubkeys("owner", owner, &token_account.owner)?;
    assert_enough_tokens("token", token, token_account, 1)?;

    // Check: token_program.
    assert_same_pubkeys("token_program", token_program, &spl_token::id())?;

    feature_account.unlock(&UnlockFeatureContext {
        recipe,
        owner,
        mint,
        token,
    })
}
