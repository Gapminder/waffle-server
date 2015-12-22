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
