import path from "path";
import * as util from "#lib/util";
import SqliteError from "#lib/sqlite-error";
import externalResources from "@softvisio/utils/external-resources";
import require from "./require.cjs";
import * as wrappers from "#lib/methods/wrappers";
import transaction from "#lib/methods/transaction";
import pragma from "#lib/methods/pragma";
import serialize from "#lib/methods/serialize";
import function1 from "#lib/methods/function";
import aggregate from "#lib/methods/aggregate";
import table from "#lib/methods/table";
import inspect from "#lib/methods/inspect";
import backup from "#lib/methods/backup";

let DEFAULT_ADDON;

const resource = await externalResources.add( `softvisio-node/sqlite/resources/node-v${process.versions.modules}-${process.platform}-${process.arch}.node` ).check();

function Database ( filenameGiven, options ) {
    if ( new.target == null ) {
        return new Database( filenameGiven, options );
    }

    // Apply defaults
    let buffer;
    if ( Buffer.isBuffer( filenameGiven ) ) {
        buffer = filenameGiven;
        filenameGiven = ":memory:";
    }
    if ( filenameGiven == null ) filenameGiven = "";
    if ( options == null ) options = {};

    // Validate arguments
    if ( typeof filenameGiven !== "string" ) throw new TypeError( "Expected first argument to be a string" );
    if ( typeof options !== "object" ) throw new TypeError( "Expected second argument to be an options object" );
    if ( "readOnly" in options ) throw new TypeError( 'Misspelled option "readOnly" should be "readonly"' );
    if ( "memory" in options ) throw new TypeError( 'Option "memory" was removed in v7.0.0 (use ":memory:" filename instead)' );

    // Interpret options
    const filename = filenameGiven.trim();
    const anonymous = filename === "" || filename === ":memory:";
    const readonly = util.getBooleanOption( options, "readonly" );
    const fileMustExist = util.getBooleanOption( options, "fileMustExist" );
    const timeout = "timeout" in options ? options.timeout : 5000;
    const verbose = "verbose" in options ? options.verbose : null;
    const nativeBindingPath = "nativeBinding" in options ? options.nativeBinding : null;

    // Validate interpreted options
    if ( readonly && anonymous && !buffer ) throw new TypeError( "In-memory/temporary databases cannot be readonly" );
    if ( !Number.isInteger( timeout ) || timeout < 0 ) throw new TypeError( 'Expected the "timeout" option to be a positive integer' );
    if ( timeout > 0x7fffffff ) throw new RangeError( 'Option "timeout" cannot be greater than 2147483647' );
    if ( verbose != null && typeof verbose !== "function" ) throw new TypeError( 'Expected the "verbose" option to be a function' );
    if ( nativeBindingPath != null && typeof nativeBindingPath !== "string" ) throw new TypeError( 'Expected the "nativeBinding" option to be a string' );

    // Load the native addon
    let addon;
    if ( nativeBindingPath == null ) {
        addon = DEFAULT_ADDON || ( DEFAULT_ADDON = require( resource.location + "/sqlite.node" ) );
    }
    else {
        addon = require( path.resolve( nativeBindingPath ).replace( /(\.node)?$/, ".node" ) );
    }
    if ( !addon.isInitialized ) {
        addon.setErrorConstructor( SqliteError );
        addon.isInitialized = true;
    }

    // Make sure the specified directory exists
    // if ( !anonymous && !fs.existsSync( path.dirname( filename ) ) ) {
    //     throw new TypeError( "Cannot open database because the directory does not exist" );
    // }

    Object.defineProperties( this, {
        [util.cppdb]: { "value": new addon.Database( filename, filenameGiven, anonymous, readonly, fileMustExist, timeout, verbose || null, buffer || null ) },
        ...wrappers.getters,
    } );
}

Database.prototype.prepare = wrappers.prepare;

Database.prototype.transaction = transaction;
Database.prototype.pragma = pragma;
Database.prototype.backup = backup;
Database.prototype.serialize = serialize;
Database.prototype.function = function1;
Database.prototype.aggregate = aggregate;
Database.prototype.table = table;
Database.prototype.loadExtension = wrappers.loadExtension;
Database.prototype.exec = wrappers.exec;
Database.prototype.close = wrappers.close;
Database.prototype.defaultSafeIntegers = wrappers.defaultSafeIntegers;
Database.prototype.unsafeMode = wrappers.unsafeMode;
Database.prototype[util.inspect] = inspect;

export default Database;
