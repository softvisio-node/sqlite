import ExternalResourceBuilder from "#core/external-resource-builder";
import { readConfig } from "#core/config";
import fs from "fs";
import glob from "#core/glob";
import childProcess from "node:child_process";
import AdmZip from "adm-zip";
import fetch from "#core/fetch";
import path from "node:path";

const id = "softvisio-node/sqlite/resources";

export default class ExternalResource extends ExternalResourceBuilder {
    #cwd;
    #betterSqlite3Version;
    #sqliteVersion;
    #sqliteUrl;

    constructor ( cwd ) {
        const name = `node-v${process.versions.modules}-${process.platform}-${process.arch}.node`;

        super( id + "/" + name );

        this.#cwd = cwd;

        this.#betterSqlite3Version = "v" + readConfig( this.#cwd + "/package.json" ).version;
    }

    async _getEtag () {
        const res = await this.#getSqliteVersion();

        if ( !res.ok ) return res;

        return result( 200, "better-sqlite3:" + this.#betterSqlite3Version + ",sqlite:" + this.#sqliteVersion );
    }

    async _build ( location ) {

        // install better-sqlite3 deps
        var res = childProcess.spawnSync( "npm", ["i", "--ignore-scripts"], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );
        if ( res.status ) return result( 500 );

        // update node-gyp to the latest version
        res = childProcess.spawnSync( "npm", ["i", "--ignore-scripts", "node-gyp@latest"], {
            "cwd": path.join( this.#cwd, "node_modules/prebuild" ),
            "shell": true,
            "stdio": "inherit",
        } );
        if ( res.status ) return result( 500 );

        // update sqlite sources
        res = await this.#updateSqlite();
        if ( !res.ok ) return res;

        // patch
        res = childProcess.spawnSync( "sed", ["-i", "-e", `"/SQLITE_USE_URI=0/ s/=0/=1/"`, "deps/defines.gypi"], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );
        if ( res.status ) return result( 500 );

        // build for current nodejs version
        res = childProcess.spawnSync( "npx", ["--no-install", "prebuild", "--strip", "--include-regex", "better_sqlite3.node$", "-r", "node"], {
            "cwd": this.#cwd,
            "shell": true,
            "stdio": "inherit",
        } );
        if ( res.status ) return result( 500 );

        const files = glob( "lib/binding/*/*.node", { "cwd": this.#cwd } );

        if ( !files.length ) return result( 500 );

        fs.copyFileSync( this.#cwd + "/" + files[0], location + "/sqlite.node" );

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
        const res = await fetch( "https://www.sqlite.org/download.html" );

        if ( !res.ok ) return res;

        const html = await res.text();

        const match = html.match( /(\d{4}\/sqlite-amalgamation-(3\d{6}).zip)/ );

        this.#sqliteVersion = "v" + match[2];

        this.#sqliteUrl = "https://www.sqlite.org/" + match[1];

        return result( 200 );
    }

    async #updateSqlite () {
        const res = childProcess.spawnSync( "curl", ["-fsSLo", "deps/sqlite3.zip", this.#sqliteUrl], {
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
