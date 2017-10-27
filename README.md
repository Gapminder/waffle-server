# Waffle Server (or simply WS)

- The main goal of WS is to store, update, evolve and serve DDF data.
- WS imports [DDF](https://docs.google.com/document/d/1wQ9hp3OoLKE3oor2TtSxXx4QMkEqEtoEYDfzQASfA6E) data from DDF repositories stored on github.
- WS serves DDF using query language specifically designed for DDF data format - [DDFQL](https://docs.google.com/document/d/1olFm-XXjWxQ4LrTCfM42an6LbjbIgnt__V1DZxSmnuQ)

## Tools that should be set up
 - MongoDB
 - Redis
 - Node.js (version >= 6.9)

## Environment variables
- `DEFAULT_USER_PASSWORD`	- is a variable for defining default WS user (example `DEFAULT_USER_PASSWORD=123`)
- `MONGODB_URL` - defines connection url for mongodb (example	`MONGODB_URL=mongodb://localhost:27017/ws_ddf_local`)
- `PORT` - defines on which port WS should run (example `PORT=3000`)
- `THRASHING_MACHINE` - this variable should be set only for WS machine that dealing with DDF importing and updating (example `THRASHING_MACHINE=true`)
- `NODE_ENV` - environment in which WS is running  (example `NODE_ENV=local`). Possible values:
 - local
 - production
 - stage
 - development

## NPM scripts
- **test** - runs all the WS test: end-to-end and unit
- **spec** - runs all units tests
- **spec:coverage** - runs all units tests and generates WS coverage report
- **e2e** - runs all integration tests
- **e2e:allCommits** - runs integration tests for all commits in DDF repository (this includes data importing and update)
- **e2e:2commit** - runs integration tests starting DDF import from second commit
- **e2e:3commit** - runs integration tests starting DDF import from third commit
- **e2e:4commit** - runs integration tests starting DDF import from fourth commit
- **local** - runs WS in local development mode
- **tsc** - compiles WS typescript files

## Run WS:
 - clone WS to the directory of you choice
 - enter this directory
 - npm i
 - npm run tsc
 - npm run local

## Additional resources
For more information please visit our [Waffle Server wiki](https://github.com/Gapminder/waffle-server/wiki).
