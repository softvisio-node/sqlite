#!/usr/bin/env node

import externalResources from "@softvisio/utils/external-resources";

externalResources.add( {
    "id": "softvisio-node/sqlite",
    "node": true,
} );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) {
    externalResources.add( {
        "id": "softvisio-node/sqlite",
        "node": true,
        "platform": "linux",
    } );
}

const res = await externalResources.update( {
    "force": false,
    "silent": false,
} );

if ( !res.ok ) process.exit( 1 );
