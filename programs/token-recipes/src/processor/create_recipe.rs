use crate::{
    assertions::{assert_empty, assert_pda, assert_same_pubkeys, assert_signer, assert_writable},
    state::{
        features::FeatureLevels,
        key::Key,
        recipe::{Recipe, RecipeStatus},
    },
    utils::create_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
    system_program,
};

pub(crate) fn create_recipe(accounts: &[AccountInfo]) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let base = next_account_info(account_info_iter)?;
    let recipe = next_account_info(account_info_iter)?;
    let authority = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    // Check: base.
    assert_signer("base", base)?;

    // Check: recipe.
    assert_writable("recipe", recipe)?;
    assert_empty("recipe", recipe)?;
    let recipe_bump: u8 = assert_pda("recipe", recipe, &crate::id(), &Recipe::seeds(base.key))?;

    // Check: authority.
    // No check needed.

    // Check: payer.
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;

    // Check: system_program.
    assert_same_pubkeys("system_program", system_program, &system_program::id())?;

    // Create the recipe account.
    let mut seeds = Recipe::seeds(base.key);
    let recipe_bump = &[recipe_bump];
    seeds.push(recipe_bump);
    create_account(
        recipe,
        payer,
        system_program,
        Recipe::INITIAL_LEN,
        &crate::id(),
        Some(&[&seeds]),
    )?;

    // Initialize the recipe account.
    Recipe {
        key: Key::Recipe,
        base: *base.key,
        authority: *authority.key,
        status: RecipeStatus::Paused,
        total_crafts: 0,
        total_crafts_with_quantity: 0,
        fees: 0,
        accumulated_admin_fees: 0,
        accumulated_shards: 0,
        accumulated_experience: 0,
        feature_levels: FeatureLevels::default(),
        inputs: vec![],
        outputs: vec![],
    }
    .save(recipe)
}
