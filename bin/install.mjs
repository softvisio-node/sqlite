#!/usr/bin/env node

import fs from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import zlib from "node:zlib";

const url = new URL( "https://github.com/softvisio-node/sqlite/releases/download/data/" );

await get( url, `node-v${process.versions.modules}-${process.platform}-${process.arch}.node` );

// under windows download linux binaries for vmware
if ( process.platform === "win32" ) await get( url, `node-v${process.versions.modules}-linux-${process.arch}.node` );

async function get ( url, file ) {
    process.stdout.write( `Downloading: ${file} ... ` );

    try {
        var res = await fetch( url + file + ".gz" );
    }
    catch ( e ) {
        console.log( e + "" );

        process.exit( 1 );
    }

    if ( !res.ok ) {
        console.log( res.status + " " + res.statusText );

        process.exit( 1 );
    }
    else {
        fs.mkdirSync( "lib/binaries", { "recursive": true } );

        const e = await pipeline( Readable.fromWeb( res.body ), zlib.createGunzip(), fs.createWriteStream( `lib/binaries/${file}` ) ).catch( e => e );

        if ( e ) {
            console.log( e + "" );

            process.exit( 1 );
        }
        else {
            console.log( "OK" );
        }
    }
}
