use crate::{
    assertions::{assert_pda, assert_same_pubkeys, assert_signer, assert_writable},
    error::TokenRecipesError,
    state::{
        features::{
            additional_outputs::AdditionalOutputsFeature, fees::FeesFeature,
            max_supply::MaxSupplyFeature, sol_payment::SolPaymentFeature,
            transfer_inputs::TransferInputsFeature, wisdom::WisdomFeature, Feature,
        },
        key::Key,
    },
    utils::create_account,
};
use solana_program::{
    account_info::{next_account_info, AccountInfo},
    entrypoint::ProgramResult,
};

pub(crate) fn admin_set_feature(accounts: &[AccountInfo], feature: Feature) -> ProgramResult {
    // Accounts.
    let account_info_iter = &mut accounts.iter();
    let program = next_account_info(account_info_iter)?;
    let feature_pda = next_account_info(account_info_iter)?;
    let payer = next_account_info(account_info_iter)?;
    let system_program = next_account_info(account_info_iter)?;

    assert_signer("program", program)?;
    assert_same_pubkeys("program", program, &crate::id())?;
    assert_writable("feature_pda", feature_pda)?;
    assert_writable("payer", payer)?;
    assert_signer("payer", payer)?;

    let (key, expected_key, seeds, size) = match feature.clone() {
        Feature::Fees(f) => (
            f.key,
            Key::FeesFeature,
            FeesFeature::seeds(),
            FeesFeature::LEN,
        ),
        Feature::AdditionalOutputs(f) => (
            f.key,
            Key::AdditionalOutputsFeature,
            AdditionalOutputsFeature::seeds(),
            AdditionalOutputsFeature::LEN,
        ),
        Feature::TransferInputs(f) => (
            f.key,
            Key::TransferInputsFeature,
            TransferInputsFeature::seeds(),
            TransferInputsFeature::LEN,
        ),
        Feature::MaxSupply(f) => (
            f.key,
            Key::MaxSupplyFeature,
            MaxSupplyFeature::seeds(),
            MaxSupplyFeature::LEN,
        ),
        Feature::SolPayment(f) => (
            f.key,
            Key::SolPaymentFeature,
            SolPaymentFeature::seeds(),
            SolPaymentFeature::LEN,
        ),
        Feature::Wisdom(f) => (
            f.key,
            Key::WisdomFeature,
            WisdomFeature::seeds(),
            WisdomFeature::LEN,
        ),
    };

    if key != expected_key {
        return Err(TokenRecipesError::InvalidAccountKey.into());
    }

    let bump = assert_pda("feature_pda", feature_pda, &crate::id(), &seeds.clone())?;
    let bump = [bump];
    let mut seeds_with_bump = seeds;
    seeds_with_bump.push(&bump);

    if feature_pda.data_is_empty() {
        create_account(
            feature_pda,
            payer,
            system_program,
            size,
            &crate::id(),
            Some(&[&seeds_with_bump]),
        )?;
    }

    match feature {
        Feature::Fees(f) => f.save(feature_pda),
        Feature::AdditionalOutputs(f) => f.save(feature_pda),
        Feature::TransferInputs(f) => f.save(feature_pda),
        Feature::MaxSupply(f) => f.save(feature_pda),
        Feature::SolPayment(f) => f.save(feature_pda),
        Feature::Wisdom(f) => f.save(feature_pda),
    }
}
