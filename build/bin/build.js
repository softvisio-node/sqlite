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
    console.log( `Uploading:`, file );

    const res = await gitHubApi.updateReleaseAsset( REPO, release.data.id, await repack( path.join( cwd, file ) ) );
    if ( !res.ok ) process.exit( 1 );
}

async function updateSqlite () {
    const res = await fetch( "https://www.sqlite.org/download.html" );
    const html = await res.text();

    const match = html.match( /(\d{4}\/sqlite-amalgamation-3\d{6}.zip)/ );

    const sqliteUrl = `https://www.sqlite.org/${match[1]}`;

    childProcess.spawnSync( "curl", ["-fsSLo", "deps/sqlite3.zip", sqliteUrl], { cwd, "shell": true, "stdio": "inherit" } );

    const zip = new AdmZip( path.join( cwd, "deps/sqlite3.zip" ) );

    for ( const entry of zip.getEntries() ) {
        if ( !entry.name ) return;

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
