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

##### Test flow:

Using [BDD](https://en.wikipedia.org/wiki/Behavior-driven_development) testing methodology (for each kind of tests)

1. Test data creation (prepare data for testing each step of the flow, writing test cases)
1. [Sanity/Smoke testing](https://en.wikipedia.org/wiki/Sanity_check) (manual testing by test cases)
1. Release testing/Upgrade testing + [Continuous Integration](https://en.wikipedia.org/wiki/Continuous_integration) (CI)
  * [Security testing](https://en.wikipedia.org/wiki/Security_testing) and [Data security](https://en.wikipedia.org/wiki/Data_security)
  * [Unit-tests](https://en.wikipedia.org/wiki/Unit_testing) (for checking isolated modules of the project) - automated, CI
  * Functional test (for checking the most common cases) - automated, CI
  * [Regression testing](https://en.wikipedia.org/wiki/Regression_testing)
  * Software performance testing (the functional requirements)
    * [load testing](https://en.wikipedia.org/wiki/Load_testing#Software_load_testing)
    * [stress](https://en.wikipedia.org/wiki/Stress_testing_(software))
    * [endurance or soak or stability](https://en.wikipedia.org/wiki/Soak_testing)
    * [performance specifications](https://en.wikipedia.org/wiki/Software_performance_testing#Performance_specifications)
    * [UX testing](https://en.wikipedia.org/wiki/Usability_testing)

For each step of testing we are checking the rest functional requirements:
  * [Issues creation/verification/investigation](https://en.wikipedia.org/wiki/Software_verification_and_validation)
  * [Localization testing](https://en.wikipedia.org/wiki/Software_testing#Internationalization_and_localization)

