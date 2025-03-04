use crate::state::{features::Feature, recipe::IngredientType};
use borsh::{BorshDeserialize, BorshSerialize};
use shank::ShankInstruction;
use solana_program::{
    instruction::{AccountMeta, Instruction},
    pubkey::Pubkey,
};

#[derive(Debug, Clone, ShankInstruction, BorshSerialize, BorshDeserialize)]
#[rustfmt::skip]
pub enum TokenRecipesInstruction {
    /// Create a new empty recipe.
    #[account(0, signer, name="base", desc = "An address to derive the recipe address from")]
    #[account(1, writable, name="recipe", desc = "The PDA of the new recipe account")]
    #[account(2, name="authority", desc = "The authority of the new recipe account")]
    #[account(3, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(4, name="system_program", desc = "The system program")]
    CreateRecipe,

    /// Add an ingredient to a recipe.
    /// This could be an input or output ingredient.
    /// CAREFUL: If the ingredient is an output, the mint authority will be transferred to the program.
    /// Removing the ingredient will transfer the mint authority back to the recipe authority if and only
    /// if no other recipe uses this mint as an output ingredient.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, optional, writable, name="mint", desc = "The mint account of the ingredient")]
    #[account(2, optional, writable, name="ingredient_record", desc = "The ingredient record PDA to discover their recipes")]
    #[account(3, optional, writable, name="delegated_ingredient", desc = "The delegated ingredient PDA for output ingredients that takes over the mint authority")]
    #[account(4, signer, name="authority", desc = "The authority of the recipe account and the mint authority of the ingredient if it's an output ingredient")]
    #[account(5, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(6, name="system_program", desc = "The system program")]
    #[account(7, name="token_program", desc = "The token program")]
    #[default_optional_accounts]
    AddIngredient {
        /// Which input or output ingredient to add.
        ingredient_type: IngredientType,
        /// The amount of tokens required if it's an input ingredient or minted otherwise.
        amount: u64,
        /// If the ingredient is an input, the destination to send the tokens to. If None, the tokens will be burned.
        destination: Option<Pubkey>,
        /// If the ingredient is an output, the maximum supply that can ever be minted.
        max_supply: Option<u64>,
    },

    /// Removes an ingredient from a recipe.
    /// This could be an input or output ingredient.
    /// If the ingredient is an output and no other recipe uses this ingredient as an output,
    /// the mint authority will be transferred back to the original authority.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, optional, writable, name="mint", desc = "The mint account of the ingredient")]
    #[account(2, optional, writable, name="ingredient_record", desc = "The ingredient record PDA to discover their recipes")]
    #[account(3, optional, writable, name="delegated_ingredient", desc = "The delegated ingredient PDA for output ingredients that takes over the mint authority")]
    #[account(4, signer, name="authority", desc = "The authority of the recipe account and the mint authority of the ingredient if it's an output ingredient")]
    #[account(5, writable, signer, name="payer", desc = "The account paying for the storage fees")]
    #[account(6, name="system_program", desc = "The system program")]
    #[account(7, name="token_program", desc = "The token program")]
    #[default_optional_accounts]
    RemoveIngredient {
        /// Which input or output ingredient to remove.
        ingredient_type: IngredientType,
    },

    /// Activate a recipe.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, signer, name="authority", desc = "The authority of the recipe account")]
    ActivateRecipe,

    /// Pause a recipe.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, signer, name="authority", desc = "The authority of the recipe account")]
    PauseRecipe,

    /// Craft a recipe.
    /// The quantity argument can be used to craft multiple recipes at once.
    /// Remaining accounts must be used to provide the required accounts of each
    /// ingredients in the order they are stored in the recipe starting with the
    /// input ingredients.
    /// 
    /// If the ingredient is an input, the remaining accounts must be:
    ///   - [writable] The mint account of the ingredient. 
    ///   - [writable] The token account of the ingredient.
    ///   - [optional] The destination account, when a destination is set on the ingredient.
    ///   - [optional, writable] The destination token account, when a destination is set on the ingredient.
    /// 
    /// If the ingredient is an output, the remaining accounts must be:
    ///   - [writable] The mint account of the ingredient.
    ///   - [writable] The token account of the ingredient.
    ///   - The delegated ingredient PDA of the ingredient.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, signer, name="owner", desc = "The owner of the token accounts")]
    #[account(2, writable, signer, name="payer", desc = "The account paying for the storage fees if we have to create associated token accounts")]
    #[account(3, name="system_program", desc = "The system program")]
    #[account(4, name="token_program", desc = "The token program")]
    #[account(5, name="ata_program", desc = "The associated token program")]
    Craft {
        /// The amount of recipes to craft.
        quantity: u64,
    },

    /// Delete a recipe.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, writable, signer, name="authority", desc = "The authority of the recipe account, it will receive the storage fees and the potential recipe fees")]
    #[account(2, writable, signer, name="payer", desc = "The account paying for the storage fees, in case an associated token account needs to be created")]
    #[account(3, writable, name="admin_fees_destination", desc = "The account that receives admin fees")]
    #[account(4, name="fees_feature_pda", desc = "The fees feature PDA storing the valid shard mint")]
    #[account(5, writable, name="shards_mint", desc = "The mint account of shard tokens")]
    #[account(6, writable, name="shards_token", desc = "The shards token account of the authority")]
    #[account(7, name="wisdom_feature_pda", desc = "The wisdom feature PDA storing the valid experience mint")]
    #[account(8, writable, name="experience_mint", desc = "The mint account of experience tokens")]
    #[account(9, writable, name="experience_token", desc = "The experience token account of the authority")]
    #[account(10, name="system_program", desc = "The system program")]
    #[account(11, name="token_program", desc = "The token program")]
    #[account(12, name="ata_program", desc = "The associated token program")]
    DeleteRecipe,

    /// [ADMIN ONLY] Set a feature on the program.
    #[account(0, signer, name="program_id", desc = "The program as a signer")]
    #[account(1, writable, name="feature_pda", desc = "The feature PDA")]
    #[account(2, signer, writable, name="payer", desc = "The account that pays for the storage fees")]
    #[account(3, name="system_program", desc = "The system program")]
    AdminSetFeature {
        /// The feature to set.
        feature: Feature,
    },

    /// Unlock a feature by burning or simply having a certain feature mint.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, name="feature_pda", desc = "The feature PDA to level up")]
    #[account(2, signer, name="authority", desc = "The authority of the recipe account")]
    #[account(3, signer, name="owner", desc = "The owner of the token account, usually the same as the authority")]
    #[account(4, writable, name="mint", desc = "The mint account that unlocks the feature")]
    #[account(5, writable, name="token", desc = "The token account linking the mint and owner accounts")]
    #[account(6, name="token_program", desc = "The token program")]
    UnlockFeature,

    /// Set the fees of a recipe once a certain level is reached on the fees feature.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, signer, name="authority", desc = "The authority of the recipe account")]
    SetFees {
        fees: u64,
    },

    /// Collect the accumulated fees and shards of a recipe.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, writable, signer, name="authority", desc = "The authority of the recipe account")]
    #[account(2, writable, name="admin_fees_destination", desc = "The account that receives admin fees")]
    #[account(3, name="fees_feature_pda", desc = "The fees feature PDA storing the valid shard mint")]
    #[account(4, writable, name="shards_mint", desc = "The mint account of shard tokens")]
    #[account(5, writable, name="shards_token", desc = "The shards token account of the authority")]
    #[account(6, writable, signer, name="payer", desc = "The account paying for the storage fees, in case an associated token account needs to be created")]
    #[account(7, name="system_program", desc = "The system program")]
    #[account(8, name="token_program", desc = "The token program")]
    #[account(9, name="ata_program", desc = "The associated token program")]
    CollectFees,

    /// Collect the accumulated experience of a recipe.
    #[account(0, writable, name="recipe", desc = "The address of the recipe account")]
    #[account(1, signer, name="authority", desc = "The authority of the recipe account")]
    #[account(2, name="wisdom_feature_pda", desc = "The wisdom feature PDA storing the valid experience mint")]
    #[account(3, writable, name="experience_mint", desc = "The mint account of experience tokens")]
    #[account(4, writable, name="experience_token", desc = "The experience token account of the authority")]
    #[account(5, writable, signer, name="payer", desc = "The account paying for the storage fees, in case an associated token account needs to be created")]
    #[account(6, name="system_program", desc = "The system program")]
    #[account(7, name="token_program", desc = "The token program")]
    #[account(8, name="ata_program", desc = "The associated token program")]
    CollectExperience,
}

pub fn create_recipe(recipe: &Pubkey, authority: &Pubkey, payer: &Pubkey) -> Instruction {
    let accounts = vec![
        AccountMeta::new(*recipe, true),
        AccountMeta::new_readonly(*authority, false),
        AccountMeta::new(*payer, true),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
    ];
    Instruction {
        program_id: crate::id(),
        accounts,
        data: TokenRecipesInstruction::CreateRecipe.try_to_vec().unwrap(),
    }
}

pub fn add_ingredient(
    recipe: &Pubkey,
    mint: &Pubkey,
    ingredient_record: &Pubkey,
    delegated_ingredient: Option<&Pubkey>,
    authority: &Pubkey,
    payer: &Pubkey,
    amount: u64,
    ingredient_type: IngredientType,
    destination: Option<Pubkey>,
    max_supply: Option<u64>,
) -> Instruction {
    let accounts = vec![
        AccountMeta::new_readonly(*recipe, false),
        AccountMeta::new_readonly(*mint, false),
        AccountMeta::new(*ingredient_record, false),
        AccountMeta::new(*delegated_ingredient.unwrap_or(&crate::id()), false),
        AccountMeta::new_readonly(*authority, true),
        AccountMeta::new(*payer, true),
        AccountMeta::new_readonly(solana_program::system_program::id(), false),
        AccountMeta::new_readonly(spl_token::id(), false),
    ];
    Instruction {
        program_id: crate::id(),
        accounts,
        data: TokenRecipesInstruction::AddIngredient {
            amount,
            ingredient_type,
            destination,
            max_supply,
        }
        .try_to_vec()
        .unwrap(),
    }
}
