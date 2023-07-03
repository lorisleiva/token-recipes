const path = require("path");
const { generateIdl } = require("@metaplex-foundation/shank-js");

const idlDir = path.join(__dirname, "..", "idls");
const binaryInstallDir = path.join(__dirname, "..", ".crates");
const programDir = path.join(__dirname, "..", "programs");

generateIdl({
  generator: "shank",
  programName: "token_recipes",
  programId: "C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T",
  idlDir,
  binaryInstallDir,
  binaryExtraArgs: ["-p", "C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T"],
  programDir: path.join(programDir, "token-recipes"),
});
