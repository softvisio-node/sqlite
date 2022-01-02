#!/usr/bin/env node

import { resolve } from "#core/utils";
import path from "path";
import childProcess from "child_process";
import GitHubApi from "#core/api/github";
import glob from "#core/glob";
import File from "#core/file";
import AdmZip from "adm-zip";
import tarStream from "tar-stream";
import zlib from "zlib";
import fs from "fs";

const REPO = "softvisio/sqlite";
const TAG = "v1.9.0";
const sqliteUrl = "https://www.sqlite.org/2021/sqlite-amalgamation-3370100.zip";

// const ELECTRON = "16.0.1";

// find better-sqlit3 location
const cwd = path.dirname( resolve( "better-sqlite3/package.json", import.meta.url ) );

// install better-sqlite3 deps
childProcess.spawnSync( "npm", ["i", "--ignore-scripts"], { cwd, "shell": true, "stdio": "inherit" } );

// update sqlite sources
await updateSqlite();

// patch
childProcess.spawnSync( "sed", ["-i", "-e", "'/SQLITE_USE_URI=0/ s/=0/=1/'", "deps/defines.gypi"], { cwd, "shell": true, "stdio": "inherit" } );

// build for current nodejs version
childProcess.spawnSync( "npx", ["--no-install", "prebuild", "--strip", "--include-regex", "better_sqlite3.node$", "-r", "node"], { cwd, "shell": true, "stdio": "inherit" } );

// build for current electron version
// childProcess.spawnSync( "npx", ["--no-install", "prebuild", "--strip", "--include-regex", "better_sqlite3.node$", "-r", "electron", "-t", ELECTRON], { cwd, "shell": true, "stdio": "inherit" } );

const gitHubApi = new GitHubApi( process.env.GITHUB_TOKEN );

const release = await gitHubApi.getReleaseByTagName( REPO, TAG );
if ( !release.ok ) process.exit( 1 );

for ( const file of glob( "prebuilds/*.tar.gz", { cwd, "sync": true } ) ) {
    const name = path.basename( file ).replace( /better-sqlite3-v\d+\.\d+\.\d+-/, "" );

    const res = await gitHubApi.updateReleaseAsset( REPO, release.data.id, new File( { "path": path.join( cwd, file ), name } ) );
    if ( !res.ok ) process.exit( 1 );
}

async function updateSqlite () {
    childProcess.spawnSync( "curl", ["-fsSLo", "deps/sqlite3.zip", sqliteUrl], { cwd, "shell": true, "stdio": "inherit" } );

    const zip = new AdmZip( path.join( cwd, "deps/sqlite3.zip" ) ),
        tar = tarStream.pack();

    zip.getEntries().forEach( f => {
        if ( !f.name ) return;

        tar.entry( { "name": f.name }, f.getData() );
    } );

    tar.finalize();

    const out = fs.createWriteStream( path.join( cwd, "deps/sqlite.tar.gz" ) );

    tar.pipe( zlib.createGzip().pipe( out ) );

    await new Promise( resolve => out.once( "end", resolve ) );

    process.exit();
}
