#!/usr/bin/env node

import stream from "#core/stream";
import { resolve } from "#core/utils";
import path from "path";
import tar from "#core/tar";
import childProcess from "child_process";
import GitHubApi from "#core/api/github";
import glob from "#core/glob";
import File from "#core/file";
import AdmZip from "adm-zip";
import fs from "fs";

const REPO = "softvisio/sqlite";
const TAG = "data";
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
    const res = await gitHubApi.updateReleaseAsset( REPO, release.data.id, await repack( path.join( cwd, file ) ) );

    if ( !res.ok ) process.exit( 1 );
}

async function updateSqlite () {
    childProcess.spawnSync( "curl", ["-fsSLo", "deps/sqlite3.zip", sqliteUrl], { cwd, "shell": true, "stdio": "inherit" } );

    const zip = new AdmZip( path.join( cwd, "deps/sqlite3.zip" ) ),
        tar = new tar.Pack( {
            "portable": true,
            "gzip": true,
        } );

    const out = fs.createWriteStream( path.join( cwd, "deps/sqlite3.tar.gz" ) );

    tar.pipe( out );

    zip.getEntries().forEach( f => {
        if ( !f.name ) return;

        tar.addFile( { "name": f.name, "content": f.getData() } );
    } );

    tar.end();

    return new Promise( resolve => out.once( "end", resolve ) );
}

async function repack ( _path ) {
    const name = path
        .basename( _path )
        .replace( /better-sqlite3-v\d+\.\d+\.\d+-/, "" )
        .replace( ".tar.gz", "" );

    return new Promise( resolve => {
        const pack = new tar.Pack( {
            "portable": true,
            "gzip": true,
        } );

        fs.createReadStream( _path )
            .pipe( new tar.Parse( { "strict": true } ) )
            .on( "entry", entry => {
                entry.path = name + ".node";

                pack.write( entry );
            } )
            .on( "end", async () => {
                pack.end();

                const buffer = await pack.pipe( new stream.PassThrough() ).buffer();

                resolve( new File( { "name": name + ".tar.gz", "content": buffer } ) );
            } );
    } );
}
