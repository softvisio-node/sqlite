#!/usr/bin/env node

import externalResources from "@softvisio/utils/external-resources";

externalResources.add(
    {
        "id": "softvisio-node/sqlite",
        "node": true,
    },
    {
        "location": "package",
    }
);

const res = await externalResources.install( {
    "force": false,
} );

if ( !res.ok ) process.exit( 1 );
