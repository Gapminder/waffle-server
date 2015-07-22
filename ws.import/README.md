### waffle-server

#### Install neo4j and run it

#####1. Install neo4j:
```
http://neo4j.com/download/
```
#####2. Start server neo4j (on Linux):
```
~/Downloads/neo4j-community-2.2.2/bin/neo4j start
```
#####3. Required steps
app expects `neo4j` user to have `neo4j` password,
 so after starting neo4j server, go to neo4j web ui by default is (browser)[http://localhost:7474/]
Default login/pass is `neo4j`/`neo4j`, but you should change password to something,
 and then run `:server change-password` in neo4j console and set pass to `neo4j`.
 Only then you can move to express server steps.
#####4. Create folder for dump
```
mkdir /tmp/neo4j-backup
```
#####5. Dump data from neo4j:
```
~/Downloads/neo4j-community-2.2.2/bin/neo4j-shell -v -c "dump match (n:Coordinates) return n;" > /tmp/neo4j-backup/coordinates.db.cql
```
#####5. Import data to neo4j:
```
~/Downloads/neo4j-community-2.2.2/bin/neo4j stop
~/Downloads/neo4j-community-2.2.2/bin/neo4j-shell -v < /tmp/neo4j-backup/all.db.cql
~/Downloads/neo4j-community-2.2.2/bin/neo4j start
```

####Install modules
#####1. Install mongodb:
```
http://docs.mongodb.org/manual/installation/
```
#####2. Restore db from dump (ask relevant staff)
```
mongorestore -v ~/Downloads/dump --drop
```
#####3. Clone repo:
```
git clone git@github.com:valor-software/waffle-server.git
mkdir waffle-server
```
#####4. Install npm modules:
```
npm i
```
#####5. Run import:
```
node ws.import/neo4j.import.js
```

#### Check everything was added properly

#####1. Go to neo4j page:
Open link (browser)[http://localhost:7474/]
#####2. Run script
```
MATCH (n) RETURN n
```
It should return number of nodes
#####3. If you want to remove everything, just do:
```
MATCH n DELETE n
```
