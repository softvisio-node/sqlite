#!/usr/bin/env node

import https from "https";
import zlib from "zlib";
import fs from "fs";

const url = new URL( "https://github.com/softvisio/sqlite/releases/download/data/" );

await get( url, `node-v${process.versions.modules}-${process.platform}-${process.arch}.node` );

// under windows download linux bindings for vmware
if ( process.platform === "win32" ) await get( url, `node-v${process.versions.modules}-linux-${process.arch}.node` );

async function get ( url, file ) {
    process.stdout.write( `Downloading: ${file} ... ` );

    const res = await new Promise( resolve => {
        https.get( url + file + ".gz", res => {
            if ( res.statusCode !== 302 ) return resolve();

            https.get( res.headers.location, res => {
                fs.mkdirSync( "lib/bindings", { "recursive": true } );

                res.pipe( zlib.createGunzip() )
                    .pipe( fs.createWriteStream( `lib/bindings/${file}` ) )
                    .on( "close", () => resolve( true ) )
                    .on( "error", e => resolve() );
            } );
        } );
    } );

    console.log( res ? "OK" : "FAIL" );

    if ( !res ) process.exit( 1 );
}
