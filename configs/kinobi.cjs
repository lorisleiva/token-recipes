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
    ingredient: {
      seeds: [
        k.stringConstantSeed("ingredient"),
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

// Update instructions.
kinobi.update(
  new k.UpdateInstructionsVisitor({
    createRecipe: {
      bytesCreatedOnChain: k.bytesFromNumber(1 + 32 + 1 + 4 + 4),
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
  })
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(new k.RenderJavaScriptVisitor(jsDir, { prettier }));
