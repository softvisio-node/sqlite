import ExternalResourceBuilder from "#core/external-resource-builder";
import { readConfig } from "#core/config";
import fs from "fs";
import glob from "#core/glob";
import childProcess from "node:child_process";
import AdmZip from "adm-zip";
import fetch from "#core/fetch";
import path from "node:path";

const USE_LATEST_SQLITE = true,
    SQLITE_VERSION = "3.45.3",
    SQLITE_YEAR = 2024,
    SQLITE_PRODUCT_VERSION =
        SQLITE_VERSION.split( "." )
            .map( ( label, idx ) => ( !idx ? label : label.padStart( 2, "0" ) ) )
            .join( "" ) + "00",
    SQLITE_URL = `https://www.sqlite.org/${ SQLITE_YEAR }/sqlite-amalgamation-${ SQLITE_PRODUCT_VERSION }.zip`;

export default class ExternalResource extends ExternalResourceBuilder {
    #cwd;
    #betterSqlite3Version;
    #sqliteVersion;
    #sqliteUrl;

    constructor ( cwd ) {
        super( {
            "id": "softvisio-node/sqlite",
            "node": true,
            "packageRoot": import.meta.url,
        } );

        this.#cwd = cwd;

        this.#betterSqlite3Version = "v" + readConfig( this.#cwd + "/package.json" ).version;
    }

    async _getEtag ( { etag, buildDate, meta } ) {
        const res = await this.#getSqliteVersion();

        if ( !res.ok ) return res;

        return result( 200, "better-sqlite3:" + this.#betterSqlite3Version + ",sqlite:" + this.#sqliteVersion );
    }

    async _build ( location ) {
        var res;

        // update sqlite sources
        res = await this.#updateSqlite();
        if ( !res.ok ) return res;

        // patch
        res = childProcess.spawnSync( "sed", [ "-i", "-e", `"/SQLITE_USE_URI=0/ s/=0/=1/"`, "deps/defines.gypi" ], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );
        if ( res.status ) return result( 500 );

        // build for current nodejs version
        res = childProcess.spawnSync( "npm", [ "run", "build-release" ], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );
        if ( res.status ) return result( 500 );

        const files = glob( "build/Release/better_sqlite3.node", { "cwd": this.#cwd } );

        if ( !files.length ) return result( 500 );

        fs.copyFileSync( this.#cwd + "/" + files[ 0 ], location + "/sqlite.node" );

        return result( 200 );
    }

    async _getMeta () {
        return {
            "better-sqlite3": this.#betterSqlite3Version,
            "sqlite": this.#sqliteVersion,
        };
    }

    // private
    async #getSqliteVersion () {
        if ( !USE_LATEST_SQLITE ) {
            this.#sqliteVersion = "v" + SQLITE_VERSION;

            this.#sqliteUrl = SQLITE_URL;
        }
        else {
            const res = await fetch( "https://www.sqlite.org/download.html" );

            if ( !res.ok ) return res;

            const html = await res.text();

            const match = html.match( /(\d{4}\/sqlite-amalgamation-(3\d{6}).zip)/ );

            this.#sqliteVersion =
                "v" +
                match[ 2 ]
                    .split( /(\d)(\d\d)(\d\d)/ )
                    .slice( 1, 4 )
                    .map( label => +label )
                    .join( "." );

            this.#sqliteUrl = "https://www.sqlite.org/" + match[ 1 ];
        }

        return result( 200 );
    }

    async #updateSqlite () {
        const res = childProcess.spawnSync( "curl", [ "-fsSLo", "deps/sqlite3.zip", this.#sqliteUrl ], {
            "cwd": this.#cwd,
            "stdio": "inherit",
        } );

        if ( res.status ) return res;

        const zip = new AdmZip( path.join( this.#cwd, "deps/sqlite3.zip" ) );

        for ( const entry of zip.getEntries() ) {
            if ( !entry.name ) continue;

            fs.writeFileSync( path.join( this.#cwd, "deps/sqlite3", entry.name ), entry.getData() );
        }

        return result( 200 );
    }
}
