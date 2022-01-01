#!/usr/bin/env node

import { resolve } from "#core/utils";
import path from "path";
import childProcess from "child_process";

// find better-sqlit3 location
const cwd = path.dirname( resolve( "better-sqlite3/package.json", import.meta.url ) );

// install better-sqlite3 deps
childProcess.spawnSync( "npm", ["i", "--ignore-scripts"], { cwd, "shell": true, "stdio": "inherit" } );

// XXX update sqlite sources

// patch
childProcess.spawnSync( "sed", ["-i", "-e", "'/SQLITE_USE_URI=0/ s/=0/=1/'", "deps/defines.gypi"], { cwd, "shell": true, "stdio": "inherit" } );

// build for current nodejs version
childProcess.spawnSync( "npx", ["--no-install", "prebuild", "--strip", "--include-regex", "better_sqlite3.node$", "-r", "node"], { cwd, "shell": true, "stdio": "inherit" } );

// build for current electron version
// childProcess.spawnSync( "npx", ["--no-install", "prebuild", "--strip", "--include-regex", "better_sqlite3.node$", "-r", "electron", "-t", "16.0.0"], { cwd, "shell": true, "stdio": "inherit" } );
