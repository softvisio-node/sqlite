# INSTALL

## NPM

```
npm i bitbucket:softvisio/softvisio-better-sqlite3#latest
```

# BUILD

```
npm pack better-sqlite3
# tar xvf ...
cd package
npm i --ignore-scripts

# linux, windows
npx prebuild --strip --include-regex "better_sqlite3.node$" -r node

npx prebuild --strip --include-regex "better_sqlite3.node$" -r node -t 15.0.0

# electron
npx prebuild --strip --include-regex "better_sqlite3.node$" -r electron -t 11.1.0
```

## CeonOS 8

```
docker run --rm -it -v$PWD:/var/local/dist softvisio/core

curl -fsSL https://bitbucket.org/softvisio/scripts/raw/master/env-build-node.sh | /bin/bash -s -- setup
curl -fsSL $(npm view better-sqlite3 dist.tarball) | tar -xz
cd package
npm i --ignore-scripts
npx prebuild --strip --include-regex "better_sqlite3.node$" -r node
npx prebuild --strip --include-regex "better_sqlite3.node$" -r node -t 15.0.0
cp prebuilds/*.tar.gz /var/local/dist
```
