const path = require("path");

const programDir = path.join(__dirname, "..", "programs");

function getProgram(...programBinary) {
  return path.join(programDir, ".bin", ...programBinary);
}

module.exports = {
  validator: {
    commitment: "processed",
    programs: [
      {
        label: "Token Recipes",
        programId: "C7zZZJpLzAehgidrbwdpBwN6RZCJo98qb55Zjep1a28T",
        deployPath: getProgram("localnet", "token_recipes.so"),
      },
      // Below are external programs that should be included in the local validator.
      // You may configure which ones to fetch from the cluster when building
      // programs within the `configs/program-scripts/dump.sh` script.
      {
        label: "Mpl Token Metadata",
        programId: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
        deployPath: getProgram("mpl_token_metadata.so"),
      },
      {
        label: "Mpl System Extras",
        programId: "SysExL2WDyJi9aRZrXorrjHJut3JwHQ7R9bTyctbNNG",
        deployPath: getProgram("mpl_system_extras.so"),
      },
      {
        label: "Mpl Token Extras",
        programId: "TokExjvjJmhKaRBShsBAsbSvEWMA1AgUNK7ps4SAc2p",
        deployPath: getProgram("mpl_token_extras.so"),
      },
    ],
  },
};
