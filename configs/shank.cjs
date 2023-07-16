const path = require("path");
const { generateIdl } = require("@metaplex-foundation/shank-js");

const idlDir = path.join(__dirname, "..", "idls");
const binaryInstallDir = path.join(__dirname, "..", ".crates");
const programDir = path.join(__dirname, "..", "programs");

generateIdl({
  generator: "shank",
  programName: "token_recipes",
  programId: "6EgVKvZu2V6cpZzarvDHuyeJwa1NB2ujj8hXY98pQpLE",
  idlDir,
  binaryInstallDir,
  binaryExtraArgs: ["-p", "6EgVKvZu2V6cpZzarvDHuyeJwa1NB2ujj8hXY98pQpLE"],
  programDir: path.join(programDir, "token-recipes"),
});
