#![cfg(feature = "test-bpf")]

use assert_matches::assert_matches;
use borsh::BorshDeserialize;
use solana_program_test::{tokio, ProgramTest};
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use token_recipes::state::{Key, Recipe, RecipeStatus};

#[tokio::test]
async fn create_recipe() {
    let mut context = ProgramTest::new("token_recipes", token_recipes::id(), None)
        .start_with_context()
        .await;

    let recipe = Keypair::new();

    let ix = token_recipes::instruction::create_recipe(
        &recipe.pubkey(),
        &context.payer.pubkey(),
        &context.payer.pubkey(),
    );

    let tx = Transaction::new_signed_with_payer(
        &[ix],
        Some(&context.payer.pubkey()),
        &[&context.payer, &recipe],
        context.last_blockhash,
    );
    context.banks_client.process_transaction(tx).await.unwrap();

    let account = context
        .banks_client
        .get_account(recipe.pubkey())
        .await
        .unwrap();

    assert!(account.is_some());

    let account = account.unwrap();
    assert_eq!(account.data.len(), Recipe::INITIAL_LEN);

    let mut account_data = account.data.as_ref();
    let my_account = Recipe::deserialize(&mut account_data).unwrap();
    assert_matches!(my_account.key, Key::Recipe);
    assert_eq!(my_account.authority, context.payer.pubkey());
    assert_matches!(my_account.status, RecipeStatus::Paused);
}
