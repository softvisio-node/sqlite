import { cppdb } from "#lib/util";

export function prepare ( sql ) {
    return this[cppdb].prepare( sql, this, false );
}

export function exec ( sql ) {
    this[cppdb].exec( sql );
    return this;
}

export function close () {
    this[cppdb].close();
    return this;
}

export function loadExtension ( ...args ) {
    this[cppdb].loadExtension( ...args );
    return this;
}

export function defaultSafeIntegers ( ...args ) {
    this[cppdb].defaultSafeIntegers( ...args );
    return this;
}

export function unsafeMode ( ...args ) {
    this[cppdb].unsafeMode( ...args );
    return this;
}

export const getters = {
    "name": {
        "get": function name () {
            return this[cppdb].name;
        },
        "enumerable": true,
    },
    "open": {
        "get": function open () {
            return this[cppdb].open;
        },
        "enumerable": true,
    },
    "inTransaction": {
        "get": function inTransaction () {
            return this[cppdb].inTransaction;
        },
        "enumerable": true,
    },
    "readonly": {
        "get": function readonly () {
            return this[cppdb].readonly;
        },
        "enumerable": true,
    },
    "memory": {
        "get": function memory () {
            return this[cppdb].memory;
        },
        "enumerable": true,
    },
};
