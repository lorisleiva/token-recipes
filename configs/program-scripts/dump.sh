#!/bin/bash

CURRENT_DIR=$(pwd)
SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
# go to parent folder
cd $(dirname $(dirname $SCRIPT_DIR))

OUTPUT=$1
# Below are external programs that should be included in the local validator.
# The program IDs and binary names should be listed in the same order.
EXTERNAL_ID=("SysExL2WDyJi9aRZrXorrjHJut3JwHQ7R9bTyctbNNG" "TokExjvjJmhKaRBShsBAsbSvEWMA1AgUNK7ps4SAc2p" "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
EXTERNAL_SO=("mpl_system_extras.so" "mpl_token_extras.so" "mpl_token_metadata.so")

if [ -z ${RPC+x} ]; then
    RPC="https://api.mainnet-beta.solana.com"
fi

if [ -z "$OUTPUT" ]; then
    echo "missing output directory"
    exit 1
fi

# creates the output directory if it doesn't exist
if [ ! -d ${OUTPUT} ]; then
    mkdir ${OUTPUT}
fi

# dump external programs binaries if needed
for i in ${!EXTERNAL_ID[@]}; do
    if [ ! -f "${OUTPUT}/${EXTERNAL_SO[$i]}" ]; then
        solana program dump -u $RPC ${EXTERNAL_ID[$i]} ${OUTPUT}/${EXTERNAL_SO[$i]}
    fi
done

cd ${CURRENT_DIR}
