### Deploy process

#### Installation
#####1. Follow the instruction:

[neo4j install on ubuntu](http://nikolas.demiridis.gr/post/51149977942/neo4j-install-on-ubuntu-lazy-admin-way)

#####2. Change neo4j user password for admin neo4j user (use more secure password)
```
curl localhost:7474/user/neo4j/password password=neo4j new_password=<NEW_PASSWORD>
```

#####3. Update config for connecting ws.import/config.js
```
NEO4J_DB_URL: 'http://neo4j:<NEW_PASSWORD>@localhost:7474'
```

#####4. Follow the instructions (except 1-3 point about installation and running neo4j server, which was correctly installed on the previous steps):
[neo4j import](./ws.import/README.md)

#####5. TODO describe instruction of installing ProxyPass (and other helping tools) and setting up the Securing access to the Neo4j Server
[Securing access](http://neo4j.com/docs/stable/security-server.html)


#### Update
#####1. Install npm modules:
```
npm i
```
#####2. Rerun app.js:
```
node app.js
```

#### Tests
#####1. Install gulp as global package:
```
npm i -g gulp
```

#####2. Run tests:
```
gulp tests
```

