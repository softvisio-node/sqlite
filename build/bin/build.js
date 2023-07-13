#!/usr/bin/env node

import "#core/stream";
import Cli from "#core/cli";
import { resolve } from "#core/utils";
import path from "path";
import childProcess from "child_process";
import glob from "#core/glob";
import AdmZip from "adm-zip";
import fs from "fs";
import fetch from "#core/fetch";
import ExternalResourceBuilder from "#core/external-resource-builder";
import { readConfig } from "#core/config";

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

const meta = { "better-sqlite3": "v" + readConfig( cwd + "/package.json" ).version };

// install better-sqlite3 deps
var res = childProcess.spawnSync( "npm", ["i", "--ignore-scripts"], {
    cwd,
    "shell": true,
    "stdio": "inherit",
} );
if ( res.status ) process.exit( res.status );

// update node-gyp to the latest version
res = childProcess.spawnSync( "npm", ["i", "--ignore-scripts", "node-gyp@latest"], {
    "cwd": path.join( cwd, "node_modules/prebuild" ),
    "shell": true,
    "stdio": "inherit",
} );
if ( res.status ) process.exit( res.status );

// update sqlite sources
await updateSqlite();

// patch
res = childProcess.spawnSync( "sed", ["-i", "-e", `"/SQLITE_USE_URI=0/ s/=0/=1/"`, "deps/defines.gypi"], {
    cwd,
    "shell": true,
    "stdio": "inherit",
} );
if ( res.status ) process.exit( res.status );

// build for current nodejs version
res = childProcess.spawnSync( "npx", ["--no-install", "prebuild", "--strip", "--include-regex", "better_sqlite3.node$", "-r", "node"], {
    cwd,
    "shell": true,
    "stdio": "inherit",
} );
if ( res.status ) process.exit( res.status );

const id = "softvisio-node/sqlite/resources";

class ExternalResource extends ExternalResourceBuilder {
    #file;
    #name;

    constructor ( file, name ) {
        super( id + "/" + name );

        this.#file = file;
        this.#name = name;
    }

    async _getEtag () {
        return result( 200, "better-sqlite3:" + meta["better-sqlite3"] + ",sqlite:" + meta.sqlite );
    }

    async _build ( location ) {
        fs.copyFileSync( this.#file, location + "/sqlite.node" );

        return result( 200 );
    }

    async _getMeta () {
        return meta;
    }
}

for ( const file of glob( "**/better_sqlite3.node", { cwd } ) ) {
    const name = `node-v${process.versions.modules}-${process.platform}-${process.arch}.node`;

    const resource = new ExternalResource( cwd + "/" + file, name );

    const res = await resource.build( { "force": process.cli.options.force } );

    if ( !res.ok ) process.exit( 1 );
}

async function updateSqlite () {
    let res = await fetch( "https://www.sqlite.org/download.html" );
    if ( !res.ok ) process.exit( res.status );

    const html = await res.text();

    const match = html.match( /(\d{4}\/sqlite-amalgamation-(3\d{6}).zip)/ );

    meta.sqlite = "v" + match[2];

    const sqliteUrl = "https://www.sqlite.org/" + match[1];

    res = childProcess.spawnSync( "curl", ["-fsSLo", "deps/sqlite3.zip", sqliteUrl], {
        cwd,
        "stdio": "inherit",
    } );
    if ( res.status ) process.exit( res.status );

    const zip = new AdmZip( path.join( cwd, "deps/sqlite3.zip" ) );

    for ( const entry of zip.getEntries() ) {
        if ( !entry.name ) continue;

        fs.writeFileSync( path.join( cwd, "deps/sqlite3", entry.name ), entry.getData() );
    }
}
