# Introduction

Repacked version of [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3).

-   added support for `file://` urls;
-   always latest `sqlite3` sources used;

Pre-compiled binaries: [https://github.com/softvisio/sqlite/releases/tag/data](https://github.com/softvisio/sqlite/releases/tag/data)

## Install

```shell
npm i @softvisio/sqlite
```

## Build

### Windows, Electron

```shell
npm pack better-sqlite3
tar xfv better-sqlite3-*.tgz
cd package
npm i --ignore-scripts

# patch
sed -i -e '/SQLITE_USE_URI=0/ s/=0/=1/' deps/defines.gypi

# windows
# current node version
npx prebuild --strip --include-regex "better_sqlite3.node$" -r node

# specific node version
# npx prebuild --strip --include-regex "better_sqlite3.node$" -r node -t 15.0.0

# electron
npx prebuild --strip --include-regex "better_sqlite3.node$" -r electron -t 15.0.0
```

### Linux

**!!! For linux you need to build it under ubuntu:latest. !!!**

```shell
docker run --rm -it -v$PWD:/var/local/mount zerocluster/node

curl -fsSL https://raw.githubusercontent.com/softvisio/scripts/main/env-build-node.sh | /bin/bash -s -- setup-build
curl -fsSL $(npm view better-sqlite3 dist.tarball) | tar -xz
cd package
npm i --ignore-scripts

# patch
sed -i -e '/SQLITE_USE_URI=0/ s/=0/=1/' deps/defines.gypi

# current node version
npx prebuild --strip --include-regex "better_sqlite3.node$" -r node

# specific node version
# npx prebuild --strip --include-regex "better_sqlite3.node$" -r node -t 15.0.0

cp prebuilds/*.tar.gz /var/local/mount
```
