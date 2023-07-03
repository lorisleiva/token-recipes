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
    feesFeature: {
      seeds: [k.stringConstantSeed("features"), k.stringConstantSeed("fees")],
    },
    additionalOutputsFeature: {
      seeds: [
        k.stringConstantSeed("features"),
        k.stringConstantSeed("additional_outputs"),
      ],
    },
    transferInputsFeature: {
      seeds: [
        k.stringConstantSeed("features"),
        k.stringConstantSeed("transfer_inputs"),
      ],
    },
    maxSupplyFeature: {
      seeds: [
        k.stringConstantSeed("features"),
        k.stringConstantSeed("max_supply"),
      ],
    },
    solPaymentFeature: {
      seeds: [
        k.stringConstantSeed("features"),
        k.stringConstantSeed("sol_payment"),
      ],
    },
    wisdomFeature: {
      seeds: [k.stringConstantSeed("features"), k.stringConstantSeed("wisdom")],
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
    adminSetFeature: {
      accounts: {
        programId: { defaultsTo: null },
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
      destination: k.vNone(),
      maxSupply: k.vNone(),
    },
    craftInstructionData: {
      quantity: k.vScalar(1),
    },
  })
);

kinobi.update(
  new k.TransformNodesVisitor([
    {
      selector: { kind: "linkTypeNode", stack: ["Feature"] },
      transformer: (node) => {
        k.assertLinkTypeNode(node);
        if (node.name === "feature") return node;
        return { ...node, importFrom: "hooked" };
      },
    },
  ])
);

// Render JavaScript.
const jsDir = path.join(clientDir, "js", "src", "generated");
const prettier = require(path.join(clientDir, "js", ".prettierrc.json"));
kinobi.accept(new k.RenderJavaScriptVisitor(jsDir, { prettier }));
