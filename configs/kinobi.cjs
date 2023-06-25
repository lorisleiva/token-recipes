const path = require("path");
const k = require("@metaplex-foundation/kinobi");

// Paths.
const clientDir = path.join(__dirname, "..", "clients");
const idlDir = path.join(__dirname, "..", "idls");

// Instanciate Kinobi.
const kinobi = k.createFromIdls([path.join(idlDir, "token_recipes.json")]);

// Update accounts.
kinobi.update(
  new k.UpdateAccountsVisitor({
    ingredientRecord: {
      seeds: [
        k.stringConstantSeed("ingredient_record"),
        k.publicKeySeed("mint", "The mint address of the ingredient"),
        k.publicKeySeed("recipe", "The address of the recipe"),
      ],
    },
    delegatedIngredient: {
      seeds: [
        k.stringConstantSeed("delegated_ingredient"),
        k.publicKeySeed("mint", "The mint address of the ingredient"),
      ],
    },
  })
);

// Global default intruction accounts.
kinobi.update(
  new k.SetInstructionAccountDefaultValuesVisitor([
    {
      account: "ingredientRecord",
      ...k.pdaDefault("ingredientRecord"),
    },
    {
      account: "delegatedIngredient",
      ...k.pdaDefault("delegatedIngredient"),
    },
  ])
);

// Update instructions.
kinobi.update(
  new k.UpdateInstructionsVisitor({
    createRecipe: {
      bytesCreatedOnChain: k.bytesFromNumber(1 + 32 + 1 + 4 + 4),
    },
    craft: {
      internal: true,
      accounts: {
        owner: { defaultsTo: k.identityDefault() },
      },
    },
  })
);

// Set ShankAccount discriminator.
const key = (name) => ({ field: "key", value: k.vEnum("Key", name) });
kinobi.update(
  new k.SetAccountDiscriminatorFromFieldVisitor({
    recipe: key("Recipe"),
    ingredient: key("Ingredient"),
    delegatedIngredient: key("DelegatedIngredient"),
  })
);

kinobi.update(
  new k.SetStructDefaultValuesVisitor({
    addIngredientInstructionData: {
      amount: k.vScalar(1),
      maxSupply: k.vNone(),
    },
    craftInstructionData: {
      quantity: k.vScalar(1),
    },
  })
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(new k.RenderJavaScriptVisitor(jsDir, { prettier }));
