#!/usr/bin/env node

import "#core/stream";
import { resolve } from "#core/utils";
import path from "path";
import tar from "#core/tar";
import childProcess from "child_process";
import GitHubApi from "#core/api/github";
import glob from "#core/glob";
import File from "#core/file";
import AdmZip from "adm-zip";
import fs from "fs";
import fetch from "#core/fetch";
import zlib from "zlib";
import env from "#core/env";

env.loadUserEnv();

const REPO = "softvisio/sqlite";
const TAG = "data";

// find better-sqlit3 location
const cwd = path.dirname( resolve( "better-sqlite3/package.json", import.meta.url ) );

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

const gitHubApi = new GitHubApi( process.env.GITHUB_TOKEN );

const release = await gitHubApi.getReleaseByTagName( REPO, TAG );
if ( !release.ok ) process.exit( 1 );

for ( const file of glob( "prebuilds/*.tar.gz", { cwd, "sync": true } ) ) {
    console.log( `Uploading:`, file );

    const res = await gitHubApi.updateReleaseAsset( REPO, release.data.id, await repack( path.join( cwd, file ) ) );
    if ( !res.ok ) process.exit( 1 );
}

async function updateSqlite () {
    let res = await fetch( "https://www.sqlite.org/download.html" );
    if ( !res.ok ) process.exit( res.status );

    const html = await res.text();

    const sqliteUrl = "https://www.sqlite.org/" + html.match( /(\d{4}\/sqlite-amalgamation-3\d{6}.zip)/ )[1];

    res = childProcess.spawnSync( "curl", ["-fsSLo", "deps/sqlite3.zip", sqliteUrl], {
        cwd,
        "shell": true,
        "stdio": "inherit",
    } );
    if ( res.status ) process.exit( res.status );

    const zip = new AdmZip( path.join( cwd, "deps/sqlite3.zip" ) );

    for ( const entry of zip.getEntries() ) {
        if ( !entry.name ) continue;

        fs.writeFileSync( path.join( cwd, "deps/sqlite3", entry.name ), entry.getData() );
    }
}

async function repack ( _path ) {
    const name = path
        .basename( _path )
        .replace( /better-sqlite3-v\d+\.\d+\.\d+-/, "" )
        .replace( ".tar.gz", ".node.gz" );

    return new Promise( resolve => {
        const gzip = zlib.createGzip();

        gzip.buffer().then( buffer => resolve( new File( { name, "content": buffer } ) ) );

        fs.createReadStream( _path )
            .pipe( new tar.Parse( { "strict": true } ) )
            .on( "entry", entry => entry.pipe( gzip ) );
    } );
}
