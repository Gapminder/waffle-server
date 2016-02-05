# waffle-server
Waffle server
please read [implementation.md](implementation.md)

## install linux
```bash
sudo apt-get install -y nodejs
sudo npm i -g webpack webpack-dev-server

```

## required env variables
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
S3_BUCKET

# Waffle Server - Vizabi integration

Integration script [is here](./ws-vizabi).

Before this script use please, read carefully the next comments:

## Next soft should be alive:
 1. MongoDB
 2. Redis
 3. Neo4J (!password=`neo4j`)
 4. WS and Vizabi Tools should not be alive

### You can use next command for stop all of `NodeJS` instances (WS or Vizabi Tools):
`kill $(ps aux | grep 'node ' | awk '{print $2}')`

## Usage:
 1. Create a separate directory.
 2. Put this script into the directory.
 3. Put [run script](./run) from current directory into the directory.
 4. Edit [run script](./run) script: put into this script AWS S3 credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET).
 5. Get MongoDB dump with `gapminder-tools` DB and put it (unpacked `dump` directory) into the directory.
 6. Run this script.

## Specification of query accepted by WS API
please read [query specification accepted by WS Public API](ws-public-api.md)

## Supported gulp tasks:

```
├── lint
├── test
├── changelog
├── release
└─┬ default
  ├── lint
  └── test
```

1. `gulp lint` - checks codebase using `eslint`
2. `gulp test` - runs all the unit tests
3. `gulp changelog` - generates content for `CHANGELOG.md` file with changes that have happened since last release
4. `gulp release` - this one is a bit more complicated. Let's start with what it needs in order to run.
  - `GITHUB_RELEASE_TOKEN` environment variable should be set up for this task:

    Example: `GITHUB_RELEASE_TOKEN=aaaaaaaaaabbbbbbbbbbccccccccccffffffffff gulp release`
    If `GITHUB_RELEASE_TOKEN` is not provided - error will be thrown and nothing happens.

  - this task understands following parameters:
    - `--major` (having initially version **0.0.0** by applying this option it will be changed to **1.0.0**).

        Example:
        ```
          GITHUB_RELEASE_TOKEN=aaaaaaaaaabbbbbbbbbbccccccccccffffffffff gulp release --major
        ```

    - `--minor` (having initially version **0.0.0** by applying this option it will be changed to **0.1.0**)

        Example:
        ```
          GITHUB_RELEASE_TOKEN=aaaaaaaaaabbbbbbbbbbccccccccccffffffffff gulp release --minor
        ```

    - `--patch` (having initially version **0.0.0** by applying this option it will be changed to **0.0.1**)

        Example:
        ```
          GITHUB_RELEASE_TOKEN=aaaaaaaaaabbbbbbbbbbccccccccccffffffffff gulp release --patch
        ```

    - By default `--patch is used` so point above is equivalent to:

        Example:
        ```
          GITHUB_RELEASE_TOKEN=aaaaaaaaaabbbbbbbbbbccccccccccffffffffff gulp release
        ```

    During the release process two files will be changed and pushed to github:
      1. CHANGELOG.md - because of added history.
      2. package.json - because of bumped version.

    **Note:** `aaaaaaaaaabbbbbbbbbbccccccccccffffffffff` - is the fake token. In order to generate proper one you need to do following: [github tutorial](https://help.github.com/articles/creating-an-access-token-for-command-line-use)

    **Even more important note:** while generating token (using tutorial given above) you need to choose which permissions should be granted to it. For our *release purposes* you need to choose all permissions under the section `repo`

