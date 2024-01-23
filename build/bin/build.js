#!/usr/bin/env node

import "#core/stream";
import Cli from "#core/cli";
import { resolve } from "#core/utils";
import path from "path";
import ExternalResourceBuilder from "#core/external-resource-builder";
import Sqlite from "#lib/sqlite";

const CLI = {
    "title": "Update resources",
    "options": {
        "force": {
            "description": "Force build",
            "default": false,
            "schema": {
                "type": "boolean",
            },
        },
    },
};

await Cli.parse( CLI );

// find better-sqlit3 location
const cwd = path.dirname( resolve( "better-sqlite3/package.json", import.meta.url ) );

const res = await ExternalResourceBuilder.build( [ new Sqlite( cwd ) ], { "force": process.cli.options.force } );

if ( !res.ok ) process.exit( 1 );
