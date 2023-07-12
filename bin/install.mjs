#!/usr/bin/env node

import externalResources from "@softvisio/external-resources";

externalResources.add( `softvisio-node/sqlite/resources/node-v${process.versions.modules}-${process.platform}-${process.arch}.node`, import.meta.url, { "location": "lib/binaries" } );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) {
    externalResources.add( `softvisio-node/sqlite/resources/node-v${process.versions.modules}-linux-${process.arch}.node`, import.meta.url, { "location": "lib/binaries" } );
}

const res = await externalResources.update( {
    "remote": true,
    "force": false,
    "silent": false,
} );

if ( !res.ok ) process.exit( 1 );
