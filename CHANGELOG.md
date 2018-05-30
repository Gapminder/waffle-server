<a name="2.12.14"></a>
## [2.12.14](https://github.com/Gapminder/waffle-server/compare/v2.12.1...v2.12.14) (2018-05-03)


### Bug Fixes

* fix autoremove script ([a103d97](https://github.com/Gapminder/waffle-server/commit/a103d97))
* **gcp:** fix environment issue with mid tests ([#591](https://github.com/Gapminder/waffle-server/issues/591)) ([a354c7c](https://github.com/Gapminder/waffle-server/commit/a354c7c))
* **GCP:** add attempting to connect to LB on GCP ([42eafe6](https://github.com/Gapminder/waffle-server/commit/42eafe6))
* **GCP:** change name convention for deployment configs ([904715b](https://github.com/Gapminder/waffle-server/commit/904715b))
* **GCP:** fis issues with deployment monogo/redis/tm instances with certain machine type and disks spaces ([f6b1480](https://github.com/Gapminder/waffle-server/commit/f6b1480))
* **GCP:** fix deployment running script ([0cc44ac](https://github.com/Gapminder/waffle-server/commit/0cc44ac))
* **GCP:** fix deployment script for working with local environment of WS ([6820572](https://github.com/Gapminder/waffle-server/commit/6820572))
* **GCP:** fix gcloud command for creation mongodb instance ([65ad137](https://github.com/Gapminder/waffle-server/commit/65ad137))
* **GCP:** fix mongo docker image url ([28716a6](https://github.com/Gapminder/waffle-server/commit/28716a6))
* **GCP:** fix mongo port ([fe8c0cf](https://github.com/Gapminder/waffle-server/commit/fe8c0cf))
* **metrics:** fix grafana monitoring filtering ([d7e66cf](https://github.com/Gapminder/waffle-server/commit/d7e66cf))
* **metrics:** fix hostname for tracking service ([add75ee](https://github.com/Gapminder/waffle-server/commit/add75ee))
* **metrics:** fix releasre date and version in tracking service ([f679d6f](https://github.com/Gapminder/waffle-server/commit/f679d6f))
* **metrics:** fix reserving internal IP for mongo instance ([8d3307b](https://github.com/Gapminder/waffle-server/commit/8d3307b))
* **mongo:** fix setuping mongo instance ([9831dde](https://github.com/Gapminder/waffle-server/commit/9831dde))
* **package:** remove package-lock.json from repo ([6ad1406](https://github.com/Gapminder/waffle-server/commit/6ad1406))
* **routes:** fix assets path for private repos ([115c8a5](https://github.com/Gapminder/waffle-server/commit/115c8a5))
* **unit-tests:** update mocha version, fix minor issues with unit tests ([74fd5e3](https://github.com/Gapminder/waffle-server/commit/74fd5e3))


### Features

* **auto-deploy:** add auto removing stack from GCP (according to semver rule) ([3728ec5](https://github.com/Gapminder/waffle-server/commit/3728ec5))
* **auto-deploy:** create auto deploument script for GCP (dev & prod environments ([8fccb77](https://github.com/Gapminder/waffle-server/commit/8fccb77))
* **error:** UI improvement that tells how to fix the wrong cli version ([80d050d](https://github.com/Gapminder/waffle-server/commit/80d050d))
* **GCP:** add integration tests before running deployment process ([4a34219](https://github.com/Gapminder/waffle-server/commit/4a34219))
* **GCP:** add integration tests before running deployment process ([1d31d5f](https://github.com/Gapminder/waffle-server/commit/1d31d5f))
* **GCP:** add mongo instance to deployment process ([658fd7a](https://github.com/Gapminder/waffle-server/commit/658fd7a))
* **GCP:** add mongo_url for WS deployment process ([efb145c](https://github.com/Gapminder/waffle-server/commit/efb145c))
* **GCP:** add PROJECT_NAME ([a830252](https://github.com/Gapminder/waffle-server/commit/a830252))
* **GCP:** add removing mongo instance ([4596c64](https://github.com/Gapminder/waffle-server/commit/4596c64))
* **GCP:** add retryable operations ([9830266](https://github.com/Gapminder/waffle-server/commit/9830266))
* **GCP:** add test environment ([cdcee62](https://github.com/Gapminder/waffle-server/commit/cdcee62))
* **GCP:** fix region issue ([c5e1fe0](https://github.com/Gapminder/waffle-server/commit/c5e1fe0))
* **GCP:** fix region quota issue ([67757dc](https://github.com/Gapminder/waffle-server/commit/67757dc))
* **GCP:** remove FOLDER_ID ([95980c4](https://github.com/Gapminder/waffle-server/commit/95980c4))
* **GCP:** skip step if already exists ([868325b](https://github.com/Gapminder/waffle-server/commit/868325b))
* **GCP:** update deployment script for retrying failed commands ([b0475a2](https://github.com/Gapminder/waffle-server/commit/b0475a2))
* **mid-tests:** setup enviromnent variable for mid tests of deployment process ([dfc64f1](https://github.com/Gapminder/waffle-server/commit/dfc64f1))
* **mid-tests:** setup enviromnent variable for mid tests of deployment process ([0a812d8](https://github.com/Gapminder/waffle-server/commit/0a812d8))



<a name="2.12.9"></a>
## [2.12.9](https://github.com/Gapminder/waffle-server/compare/v2.12.1...v2.12.9) (2018-04-05)


### Bug Fixes

* fix autoremove script ([a103d97](https://github.com/Gapminder/waffle-server/commit/a103d97))
* **gcp:** fix environment issue with mid tests ([#591](https://github.com/Gapminder/waffle-server/issues/591)) ([a354c7c](https://github.com/Gapminder/waffle-server/commit/a354c7c))
* **GCP:** add attempting to connect to LB on GCP ([42eafe6](https://github.com/Gapminder/waffle-server/commit/42eafe6))
* **GCP:** change name convention for deployment configs ([904715b](https://github.com/Gapminder/waffle-server/commit/904715b))
* **GCP:** fis issues with deployment monogo/redis/tm instances with certain machine type and disks spaces ([f6b1480](https://github.com/Gapminder/waffle-server/commit/f6b1480))
* **GCP:** fix deployment running script ([0cc44ac](https://github.com/Gapminder/waffle-server/commit/0cc44ac))
* **GCP:** fix deployment script for working with local environment of WS ([6820572](https://github.com/Gapminder/waffle-server/commit/6820572))
* **GCP:** fix gcloud command for creation mongodb instance ([65ad137](https://github.com/Gapminder/waffle-server/commit/65ad137))
* **GCP:** fix mongo docker image url ([28716a6](https://github.com/Gapminder/waffle-server/commit/28716a6))
* **GCP:** fix mongo port ([fe8c0cf](https://github.com/Gapminder/waffle-server/commit/fe8c0cf))
* **routes:** fix assets path for private repos ([115c8a5](https://github.com/Gapminder/waffle-server/commit/115c8a5))
* **unit-tests:** update mocha version, fix minor issues with unit tests ([74fd5e3](https://github.com/Gapminder/waffle-server/commit/74fd5e3))


### Features

* **auto-deploy:** add auto removing stack from GCP (according to semver rule) ([3728ec5](https://github.com/Gapminder/waffle-server/commit/3728ec5))
* **auto-deploy:** create auto deploument script for GCP (dev & prod environments ([8fccb77](https://github.com/Gapminder/waffle-server/commit/8fccb77))
* **GCP:** add integration tests before running deployment process ([1d31d5f](https://github.com/Gapminder/waffle-server/commit/1d31d5f))
* **GCP:** add integration tests before running deployment process ([4a34219](https://github.com/Gapminder/waffle-server/commit/4a34219))
* **GCP:** add mongo instance to deployment process ([658fd7a](https://github.com/Gapminder/waffle-server/commit/658fd7a))
* **GCP:** add mongo_url for WS deployment process ([efb145c](https://github.com/Gapminder/waffle-server/commit/efb145c))
* **GCP:** add PROJECT_NAME ([a830252](https://github.com/Gapminder/waffle-server/commit/a830252))
* **GCP:** add removing mongo instance ([4596c64](https://github.com/Gapminder/waffle-server/commit/4596c64))
* **GCP:** add retryable operations ([9830266](https://github.com/Gapminder/waffle-server/commit/9830266))
* **GCP:** add test environment ([cdcee62](https://github.com/Gapminder/waffle-server/commit/cdcee62))
* **GCP:** fix region issue ([c5e1fe0](https://github.com/Gapminder/waffle-server/commit/c5e1fe0))
* **GCP:** fix region quota issue ([67757dc](https://github.com/Gapminder/waffle-server/commit/67757dc))
* **GCP:** remove FOLDER_ID ([95980c4](https://github.com/Gapminder/waffle-server/commit/95980c4))
* **GCP:** skip step if already exists ([868325b](https://github.com/Gapminder/waffle-server/commit/868325b))
* **GCP:** update deployment script for retrying failed commands ([b0475a2](https://github.com/Gapminder/waffle-server/commit/b0475a2))
* **mid-tests:** setup enviromnent variable for mid tests of deployment process ([dfc64f1](https://github.com/Gapminder/waffle-server/commit/dfc64f1))
* **mid-tests:** setup enviromnent variable for mid tests of deployment process ([0a812d8](https://github.com/Gapminder/waffle-server/commit/0a812d8))



<a name="2.12.1"></a>
## [2.12.1](https://github.com/Gapminder/waffle-server/compare/v2.12.0...v2.12.1) (2017-11-27)


### Bug Fixes

* **ddfql:** fix query normalizer for entity_sets ([4896681](https://github.com/Gapminder/waffle-server/commit/4896681))



<a name="2.12.0"></a>
# [2.12.0](https://github.com/Gapminder/waffle-server/compare/v2.11.1...v2.12.0) (2017-11-21)


### Bug Fixes

* **ddfql:** add functionality for adding entity_set as dimensionConcept to Datapoint, change unit tests ([c463876](https://github.com/Gapminder/waffle-server/commit/c463876))
* **ddfql:** fix ddf ql query normalizer for working with empty entities condition ([716e9b5](https://github.com/Gapminder/waffle-server/commit/716e9b5))
* **dockerfile:** fix docker_run file for node instance ([abcea18](https://github.com/Gapminder/waffle-server/commit/abcea18))
* **haproxy:** fix haproxy config ([77577e1](https://github.com/Gapminder/waffle-server/commit/77577e1))


### Features

* **docker:** add tools - htop, net-tools, nano, lsof to docker images ([02dc568](https://github.com/Gapminder/waffle-server/commit/02dc568))
* **monitoring-tools:** add monitoring tools with all needed environment variables ([7f5ed28](https://github.com/Gapminder/waffle-server/commit/7f5ed28))



<a name="2.11.0"></a>
# [2.11.0](https://github.com/Gapminder/waffle-server/compare/v2.10.0...v2.11.0) (2017-10-27)


### Bug Fixes

* fix HostPort for AWS settings on Node Instances and TM ([f46b6ba](https://github.com/Gapminder/waffle-server/commit/f46b6ba))
* **pm2:** changes pm2-docker configuration ([41de1fb](https://github.com/Gapminder/waffle-server/commit/41de1fb))



<a name="2.11.0"></a>
# [2.11.0](https://github.com/Gapminder/waffle-server/compare/v2.10.0...v2.11.0) (2017-10-27)


### Bug Fixes

* fix HostPort for AWS settings on Node Instances and TM ([f46b6ba](https://github.com/Gapminder/waffle-server/commit/f46b6ba))
* **pm2:** changes pm2-docker configuration ([41de1fb](https://github.com/Gapminder/waffle-server/commit/41de1fb))


<a name="2.10.0"></a>
# [2.10.0](https://github.com/Gapminder/waffle-server/compare/v2.9.5...v2.10.0) (2017-10-24)


### Bug Fixes

* add concept types which are supported by DDF data model ([9653b88](https://github.com/Gapminder/waffle-server/commit/9653b88))
* **docker:** fix docker_run file ([633494a](https://github.com/Gapminder/waffle-server/commit/633494a))
* **docker:** fix docker_run file for running key metrics logging ([abf2b2d](https://github.com/Gapminder/waffle-server/commit/abf2b2d))
* **docker:** fix docker_run file for TM ([286a597](https://github.com/Gapminder/waffle-server/commit/286a597))
* **pm2:** add delay for running key metrics logging for development stack ([b476638](https://github.com/Gapminder/waffle-server/commit/b476638))
* **pm2:** update ecosystem.config ([ea680f0](https://github.com/Gapminder/waffle-server/commit/ea680f0))
* **recent-queries:** fix logging for recent ddf queries ([d8c7060](https://github.com/Gapminder/waffle-server/commit/d8c7060))


### Features

* **pm2:** add supporting of pm2 module ([7f190ad](https://github.com/Gapminder/waffle-server/commit/7f190ad))



<a name="2.9.5"></a>
## [2.9.5](https://github.com/Gapminder/waffle-server/compare/v2.9.4...v2.9.5) (2017-10-19)


### Bug Fixes

* add diffs and repos folder ([aed0935](https://github.com/Gapminder/waffle-server/commit/aed0935))
* exclude tracking changes for diffs and repos folder via .gitignore ([82b6ed5](https://github.com/Gapminder/waffle-server/commit/82b6ed5))
* **deployment:** fix haproxy issue ([e40ead8](https://github.com/Gapminder/waffle-server/commit/e40ead8))


### Features

* **newrelic:** add environment to name of newrelic app ([a55e2bd](https://github.com/Gapminder/waffle-server/commit/a55e2bd))
* **routes:** change CORS headers for OPTIONS request for /api/ddf/ml-ql route ([ff29fdb](https://github.com/Gapminder/waffle-server/commit/ff29fdb))



<a name="2.9.4"></a>
## [2.9.4](https://github.com/Gapminder/waffle-server/compare/v2.9.3...v2.9.4) (2017-09-27)


### Bug Fixes

* **deployment:** fix issue with ECS_INSTANCE_TYPE ([7b82ac3](https://github.com/Gapminder/waffle-server/commit/7b82ac3))
* **deployment:** fix issue with ECS_INSTANCE_TYPE ([fb85c83](https://github.com/Gapminder/waffle-server/commit/fb85c83))


### Features

* **e2e:** datasets branch version - import flow ([f9ca80e](https://github.com/Gapminder/waffle-server/commit/f9ca80e))
* **e2e:** datasets branch version - import flow. changes according to review. ([f79b82f](https://github.com/Gapminder/waffle-server/commit/f79b82f))
* **e2e:** datasets branch version - import flow. changes according to review. ([6e492eb](https://github.com/Gapminder/waffle-server/commit/6e492eb))
* **e2e:** datasets branch version - import flow. changes according to review. ([a331d58](https://github.com/Gapminder/waffle-server/commit/a331d58))
* **e2e:** datasets branch version - import flow. fix async typings. ([261fcda](https://github.com/Gapminder/waffle-server/commit/261fcda))
* **e2e:** datasets branch version - import flow. fix cli service unit test. ([bb98628](https://github.com/Gapminder/waffle-server/commit/bb98628))
* **e2e:** datasets branch version - import flow. fix unit tests. ([fde5276](https://github.com/Gapminder/waffle-server/commit/fde5276))
* **e2e:** datasets branch version - import flow. in progress. ([8590037](https://github.com/Gapminder/waffle-server/commit/8590037))



<a name="2.9.3"></a>
## [2.9.3](https://github.com/Gapminder/waffle-server/compare/v2.9.2...v2.9.3) (2017-09-26)


### Bug Fixes

* fix aws instance settings ([b83d560](https://github.com/Gapminder/waffle-server/commit/b83d560))



<a name="2.9.3"></a>
## [2.9.3](https://github.com/Gapminder/waffle-server/compare/v2.9.2...v2.9.3) (2017-09-26)


### Bug Fixes

* fix aws instance settings ([b83d560](https://github.com/Gapminder/waffle-server/commit/b83d560))



<a name="2.9.3"></a>
## [2.9.3](https://github.com/Gapminder/waffle-server/compare/v2.9.2...v2.9.3) (2017-09-25)


### Bug Fixes

* fix aws instance settings ([b83d560](https://github.com/Gapminder/waffle-server/commit/b83d560))



<a name="2.9.2"></a>
## [2.9.2](https://github.com/Gapminder/waffle-server/compare/v2.9.1...v2.9.2) (2017-09-21)


### Bug Fixes

* **passport:** use passport middleware just for cli routes & remove other unnecessary middlewares ([5afc1a0](https://github.com/Gapminder/waffle-server/commit/5afc1a0))



<a name="2.9.1"></a>
## [2.9.1](https://github.com/Gapminder/waffle-server/compare/v2.9.0...v2.9.1) (2017-09-13)


### Bug Fixes

* change pre-commit hook to pre-push hook ([0a65656](https://github.com/Gapminder/waffle-server/commit/0a65656))
* fix dataset name handling ([37fd867](https://github.com/Gapminder/waffle-server/commit/37fd867))
* fix e2e runner ([84ee475](https://github.com/Gapminder/waffle-server/commit/84ee475))
* **db:** fix the way imported dataset name is resolved ([e62c2cd](https://github.com/Gapminder/waffle-server/commit/e62c2cd))
* **repo-service:** fix options for cleaning repos dir function & add running cloning process of all imported repos ([ecfc4ab](https://github.com/Gapminder/waffle-server/commit/ecfc4ab))



<a name="2.9.0"></a>
# [2.9.0](https://github.com/Gapminder/waffle-server/compare/v2.8.0...v2.9.0) (2017-09-05)


### Bug Fixes

* **dataset-repository:** fix query to datasets collection ([36f1d98](https://github.com/Gapminder/waffle-server/commit/36f1d98))
* **deployment:** add "--no-include-email" option for get-login command in aws-cli ([3740fc5](https://github.com/Gapminder/waffle-server/commit/3740fc5))
* **import:** fix import process for sodertornsmodellen dataset ([eac8c06](https://github.com/Gapminder/waffle-server/commit/eac8c06))


### Features

* add a job for killing long running queries ([0254674](https://github.com/Gapminder/waffle-server/commit/0254674))
* **datasets:** add checking progress functionality for import/update dataset. ([3545c06](https://github.com/Gapminder/waffle-server/commit/3545c06))
* **warmup:** add timeSpentInMillis and docsAmount fields to recent ddfql queries collection ([69d8860](https://github.com/Gapminder/waffle-server/commit/69d8860))



<a name="2.8.0"></a>
# [2.8.0](https://github.com/Gapminder/waffle-server/compare/v2.7.0...v2.8.0) (2017-08-03)


### Bug Fixes

* fix issue on ws when try to get commits list ([1bfaa7e](https://github.com/Gapminder/waffle-server/commit/1bfaa7e))
* **cache:** fix cache memory leak; upgrade dependencies ([9d1254b](https://github.com/Gapminder/waffle-server/commit/9d1254b))
* **datasets.repository:** detect datasets imported from master taking into account that specifying branch for it is not required ([0d1c430](https://github.com/Gapminder/waffle-server/commit/0d1c430))
* **ddfql:** use entity_domain or entity_set as a query criteria properly ([bd4d1d8](https://github.com/Gapminder/waffle-server/commit/bd4d1d8))
* **import:** disable import stats ([2bf7d79](https://github.com/Gapminder/waffle-server/commit/2bf7d79))


### Performance Improvements

* **repos.service.ts:** use shelljs instead of simple-git ([5064e93](https://github.com/Gapminder/waffle-server/commit/5064e93))



<a name="2.7.0"></a>
# [2.7.0](https://github.com/Gapminder/waffle-server/compare/v2.6.0...v2.7.0) (2017-06-19)


### Bug Fixes

* **data-points.model:** make index more selective ([5aae17a](https://github.com/Gapminder/waffle-server/commit/5aae17a))
* **datapoints:** add additional index ([f4c6f87](https://github.com/Gapminder/waffle-server/commit/f4c6f87))
* **docker_run:** set stack_trace_limit to 0 in node in order to avoid memory leaks ([26d610a](https://github.com/Gapminder/waffle-server/commit/26d610a))
* **format.service:** fix csv format - make it work with data as stream or just an object ([d115928](https://github.com/Gapminder/waffle-server/commit/d115928))
* **indexes:** change indexes for entities, datapoints and concepts in order to improve performance ([8f91d49](https://github.com/Gapminder/waffle-server/commit/8f91d49))
* **repos-service:** fix git flow ([701da11](https://github.com/Gapminder/waffle-server/commit/701da11))
* **unit-tests:** fix unit tests proxiquire error ([67b98a7](https://github.com/Gapminder/waffle-server/commit/67b98a7))
* **warmup:** do not allow warmup to persist responses grabbed from WS; update ddf-validator ([cc75e84](https://github.com/Gapminder/waffle-server/commit/cc75e84))


### Features

* **assets:** clone imported datasets repositories on threshing machine during startup ([20eed02](https://github.com/Gapminder/waffle-server/commit/20eed02))
* **assets:** serve assets available in ddf datasets under appropriate directory ([c573d3e](https://github.com/Gapminder/waffle-server/commit/c573d3e))
* **datapoints-repository:** add data limitation for datapoints query ([87f0518](https://github.com/Gapminder/waffle-server/commit/87f0518))
* **DdfSchema:** rework ddf schema and availability querties according to the new spec ([c936c9b](https://github.com/Gapminder/waffle-server/commit/c936c9b))



<a name="2.6.0"></a>
# [2.6.0](https://github.com/Gapminder/waffle-server/compare/v2.5.0...v2.6.0) (2017-04-25)


### Bug Fixes

* teach WS to handle is-- operator correctly during a dataset import/update ([b47a061](https://github.com/Gapminder/waffle-server/commit/b47a061))
* **ddfql-urlon:** assume that dataset sent in urlon ddfql is encoded with encodeURIComponent ([5a7c12c](https://github.com/Gapminder/waffle-server/commit/5a7c12c))


### Features

* **steps:** add step for cleaning repos folder ([0c1cb90](https://github.com/Gapminder/waffle-server/commit/0c1cb90))
* **WS-CLI:** ensure that clinent requests come from the WS-CLI version supported be WS ([66c987e](https://github.com/Gapminder/waffle-server/commit/66c987e))



<a name="2.5.0"></a>
# [2.5.0](https://github.com/Gapminder/waffle-server/compare/v2.4.0...v2.5.0) (2017-03-24)


### Bug Fixes

* update dependencies, fix schema generator ([efca66f](https://github.com/Gapminder/waffle-server/commit/efca66f))
* **concepts-schema:** generate concepts schema not from records but from headers ([2271a87](https://github.com/Gapminder/waffle-server/commit/2271a87))
* **ddfql:** fix the way domain and sets from join.key interpreted in join.where ([8ece302](https://github.com/Gapminder/waffle-server/commit/8ece302))
* **docker_run.ts:** make WS restarting on failure when running in docker container ([0789244](https://github.com/Gapminder/waffle-server/commit/0789244))
* **entities schema:** serve domain's props as intersection of all its props with all its entity set props ([9a7654b](https://github.com/Gapminder/waffle-server/commit/9a7654b))
* **import-update:** extract transaction in "after steps" handler properly ([715f26f](https://github.com/Gapminder/waffle-server/commit/715f26f))
* **removal-dataset:** add dataset unlocking if error happened during removal process ([419ad1d](https://github.com/Gapminder/waffle-server/commit/419ad1d))
* **ws-tests:** create stubs for logger in utils test ([752bbcc](https://github.com/Gapminder/waffle-server/commit/752bbcc))


### Features

* **ws-tests:** create stub for logger in import entities test ([d999d81](https://github.com/Gapminder/waffle-server/commit/d999d81))
* **ws-tests:** create stubs fo logger in import dataset schema test ([cdd19cc](https://github.com/Gapminder/waffle-server/commit/cdd19cc))
* **ws-tests:** create stubs fo logger in import dataset service test ([6692ea5](https://github.com/Gapminder/waffle-server/commit/6692ea5))
* **ws-tests:** create stubs for logger in import datapoints test ([c46f679](https://github.com/Gapminder/waffle-server/commit/c46f679))
* **ws-tests:** create stubs for logger in import repos service test ([0379433](https://github.com/Gapminder/waffle-server/commit/0379433))
* **ws-tests:** create stubs for logger in translations test ([fb34c88](https://github.com/Gapminder/waffle-server/commit/fb34c88))
* **ws-tests:** create stubs for logger in update datapoints test ([9509667](https://github.com/Gapminder/waffle-server/commit/9509667))



<a name="2.4.0"></a>
# [2.4.0](https://github.com/Gapminder/waffle-server/compare/v2.3.0...v2.4.0) (2017-02-14)


### Bug Fixes

* **adapter-service:** respond with shapes json correctly ([4d92489](https://github.com/Gapminder/waffle-server/commit/4d92489))
* **dataset.serivce:** fix datapoints removal ([6ce780e](https://github.com/Gapminder/waffle-server/commit/6ce780e))
* **deploy:** grant x permission for docker_run.js, fix docker_run.js shell ([e5b7b6b](https://github.com/Gapminder/waffle-server/commit/e5b7b6b))
* **docker-compose:** store redis cache in a volume so that it could survive constainer restarts ([ba7aeaf](https://github.com/Gapminder/waffle-server/commit/ba7aeaf))


### Features

* migrate codebase to typescript ([9de9e10](https://github.com/Gapminder/waffle-server/commit/9de9e10))
* **cli:** add dataset removal status route ([24e442f](https://github.com/Gapminder/waffle-server/commit/24e442f))
* **csv-format:** add ability to send ddfql requests in csv ([919c01d](https://github.com/Gapminder/waffle-server/commit/919c01d))
* **datasets in progress route:** add route that serves datasets that are currently in progress (removing, updating, importing) ([201036e](https://github.com/Gapminder/waffle-server/commit/201036e))
* **docker-compose:** add docker-compose for Windows configuration, updated documentation ([6b0c611](https://github.com/Gapminder/waffle-server/commit/6b0c611))
* **docker-compose:** add docker-compose.yml file in order to facilitate WS standalone feature ([03ba6e2](https://github.com/Gapminder/waffle-server/commit/03ba6e2))
* **format:** update ws-json format ([d896481](https://github.com/Gapminder/waffle-server/commit/d896481))
* **routes:** add new route for populating documents ([c0c95ff](https://github.com/Gapminder/waffle-server/commit/c0c95ff))
* **vizabi-tools-page:** add vizabi tools page as a separate service in docker-compose ([ad1e283](https://github.com/Gapminder/waffle-server/commit/ad1e283))



<a name="2.3.0"></a>
# [2.3.0](https://github.com/Gapminder/waffle-server/compare/v2.2.0...v2.3.0) (2017-01-11)


### Bug Fixes

* **availability queries:** calculate functions for datapoints in series not in parallel because of mongo connection timeout ([938e64a](https://github.com/Gapminder/waffle-server/commit/938e64a))
* **cache:** do not try to store parsed ddfql queries in mongo cause they contain dollar signs ([2b87bb7](https://github.com/Gapminder/waffle-server/commit/2b87bb7))
* **cache:** fix cache for GET and POST routes to ddfql ([7404fd2](https://github.com/Gapminder/waffle-server/commit/7404fd2))
* **cache:** remove trailing slashes from cache key part and obsolete cache cleaning tasks ([1355568](https://github.com/Gapminder/waffle-server/commit/1355568))
* **cli-controller:** fix removing dataset to proper usage of user ([1487b42](https://github.com/Gapminder/waffle-server/commit/1487b42))
* **entities,concepts:** do not coerce fields to numbers if they are not of type "measure" ([fea3d05](https://github.com/Gapminder/waffle-server/commit/fea3d05))
* **entity:** fix cached of founded in datapoints entites (these are time entities most often like years, months, etc.) ([c0db7e4](https://github.com/Gapminder/waffle-server/commit/c0db7e4))
* **inc-update:** update concepts ([30b20af](https://github.com/Gapminder/waffle-server/commit/30b20af))
* **model:** take into account that object might come with populated values in ddf mapper ([7261f4e](https://github.com/Gapminder/waffle-server/commit/7261f4e))
* **package.json:** provide correct URLON version ([1184595](https://github.com/Gapminder/waffle-server/commit/1184595))
* **schema:** change a way schema stats are collected for datapoint - currently those queries should work much faster ([14f1119](https://github.com/Gapminder/waffle-server/commit/14f1119))
* **translations:** translate property only when actual translation for it is available - otherwise use  original value ([003b0e6](https://github.com/Gapminder/waffle-server/commit/003b0e6))
* **warmup:**  don't use query done via post to warm up WS ([3cf05b2](https://github.com/Gapminder/waffle-server/commit/3cf05b2))
* **warmup:** store warm up queries only for default dataset ([6eaf726](https://github.com/Gapminder/waffle-server/commit/6eaf726))
* **warmup:** store warmup queries only when it is proved that they are ok to be executed ([818c284](https://github.com/Gapminder/waffle-server/commit/818c284))


### Features

* **cache:** add cache warmup when WS starts and switches dataset ([4236a15](https://github.com/Gapminder/waffle-server/commit/4236a15))
* **cli-api:** add cache invalidation route ([a79fb6e](https://github.com/Gapminder/waffle-server/commit/a79fb6e))
* **cli.controller:** make sure that errors will come to cli as strings, refactor cli.controller to make it more testable ([c603146](https://github.com/Gapminder/waffle-server/commit/c603146))
* **cli.controller:** provide route for getting private datasets ([4b95d95](https://github.com/Gapminder/waffle-server/commit/4b95d95))
* **configure_template:** add memory params ([314729b](https://github.com/Gapminder/waffle-server/commit/314729b))
* **configure_template:** add vps params ([e7f712a](https://github.com/Gapminder/waffle-server/commit/e7f712a))
* **dataset-service:** implement removing dataset from mongodb ([58f4e45](https://github.com/Gapminder/waffle-server/commit/58f4e45))
* **datasets:** add support for importing and incrementally update datasets from private repositories ([a804718](https://github.com/Gapminder/waffle-server/commit/a804718))
* **ddfql:** add support for querying GET requests ([2ac855e](https://github.com/Gapminder/waffle-server/commit/2ac855e))
* **ddfql:** change the way ddfql queries are generated for datapoints ([b2fd811](https://github.com/Gapminder/waffle-server/commit/b2fd811))
* **ddfql route:** parse queries in URLON format, improve redis cache key name generation ([e0f2964](https://github.com/Gapminder/waffle-server/commit/e0f2964))
* **haproxy:** change haproxy conf ([c591055](https://github.com/Gapminder/waffle-server/commit/c591055))
* **import:** add logger to dataset index import process ([7058629](https://github.com/Gapminder/waffle-server/commit/7058629))
* **route:** add route for getting only datasets that can be removed ([5f04138](https://github.com/Gapminder/waffle-server/commit/5f04138))
* **unit-tests:** add unit test for removing dataset process ([f0b3b1f](https://github.com/Gapminder/waffle-server/commit/f0b3b1f))
* **unit-tests:** add unittests for rollback functionality ([fd24347](https://github.com/Gapminder/waffle-server/commit/fd24347))
* **unit-tests:** add unittests for set default transaction functionality ([17fe52f](https://github.com/Gapminder/waffle-server/commit/17fe52f))



<a name="2.2.0"></a>
# [2.2.0](https://github.com/Gapminder/waffle-server/compare/v2.1.2...v2.2.0) (2016-12-07)


### Features

* **e2e-tests:** add e2e tests for translations ([73f69b1](https://github.com/Gapminder/waffle-server/commit/73f69b1))
* **e2e-tests:** make different types of import ([7cd01f6](https://github.com/Gapminder/waffle-server/commit/7cd01f6))
* **translations:** add datapoints translations incremental update ([7ff648a](https://github.com/Gapminder/waffle-server/commit/7ff648a))
* **unit-test:** add unit test for entities import ([2e48759](https://github.com/Gapminder/waffle-server/commit/2e48759))



<a name="2.1.2"></a>
## [2.1.2](https://github.com/Gapminder/waffle-server/compare/v2.1.1...v2.1.2) (2016-12-01)


### Bug Fixes

* **ddf import,update:** search previous version of entities, datapoints, and concepts via previous transaction ([31882ab](https://github.com/Gapminder/waffle-server/commit/31882ab))



<a name="2.1.1"></a>
## [2.1.1](https://github.com/Gapminder/waffle-server/compare/v2.1.0...v2.1.1) (2016-12-01)



<a name="2.1.0"></a>
# [2.1.0](https://github.com/Gapminder/waffle-server/compare/v2.0.0...v2.1.0) (2016-12-01)


### Bug Fixes

* **translations:**  preserve originId for concepts that were translated ([c0c16cc](https://github.com/Gapminder/waffle-server/commit/c0c16cc))
* **translations:** extend context not from its frozen version as first param ([868a023](https://github.com/Gapminder/waffle-server/commit/868a023))
* **translations:** remove translations from entities and concepts properly during incremental update ([058bc4c](https://github.com/Gapminder/waffle-server/commit/058bc4c))


### Features

* **import:** add translations into import process ([89fe373](https://github.com/Gapminder/waffle-server/commit/89fe373))
* **import:** add unit tests for translations import process ([1e24d88](https://github.com/Gapminder/waffle-server/commit/1e24d88))
* **incremental-update:** add e2e tests for translations incremental update process ([b740856](https://github.com/Gapminder/waffle-server/commit/b740856))
* **translations:** transform translations in the same way as properties ([07f8cc2](https://github.com/Gapminder/waffle-server/commit/07f8cc2))
* **translations update:** WIP ([7ce1a31](https://github.com/Gapminder/waffle-server/commit/7ce1a31))
* **translations update:** WIP ([3ea2eb9](https://github.com/Gapminder/waffle-server/commit/3ea2eb9))
* **translations update:** WIP ([25e3e0e](https://github.com/Gapminder/waffle-server/commit/25e3e0e))
* **unit-tests:** create unit tests for datapoints import process ([18a38b7](https://github.com/Gapminder/waffle-server/commit/18a38b7))



<a name="2.0.0"></a>
# [2.0.0](https://github.com/Gapminder/waffle-server/compare/v1.2.0...v2.0.0) (2016-11-28)


### Bug Fixes

* **deploy:** expose port 80 for WS thrashing machine ([7bf06c6](https://github.com/Gapminder/waffle-server/commit/7bf06c6))
* **repos.service:** do branch hard reset each time checkout is invoked ([d9e3af2](https://github.com/Gapminder/waffle-server/commit/d9e3af2))


### Features

* move concepts and entities to their separate importing modules, import datapoints, entities, concepts, indexes using datapackage.json, import entites using streams ([bb724cb](https://github.com/Gapminder/waffle-server/commit/bb724cb))
* **datapoints:** apply incremental updates to datapoints via stream ([9665787](https://github.com/Gapminder/waffle-server/commit/9665787))
* **datapoints:** apply incremental updates to entities via stream ([68dd560](https://github.com/Gapminder/waffle-server/commit/68dd560))
* **ddf-import:** import datasets from github branches ([89dc473](https://github.com/Gapminder/waffle-server/commit/89dc473))
* **ddf-mappers:** use same mappers for both importing and inc update ([96cde77](https://github.com/Gapminder/waffle-server/commit/96cde77))
* **ddfql:** support "by sets" queries to datapoints ([fcbb9ff](https://github.com/Gapminder/waffle-server/commit/fcbb9ff))
* **deploy:** add new deployment topology for WS - with machine dedicated to ddf importing ([4f123e9](https://github.com/Gapminder/waffle-server/commit/4f123e9))
* **inc-update:** add striming for concepts updating ([319c7d8](https://github.com/Gapminder/waffle-server/commit/319c7d8))
* **repository factory:** cache repositories ([18baba5](https://github.com/Gapminder/waffle-server/commit/18baba5))
* **time:** turn quarter, month, day, year, week into entity_domain's ([cd085ee](https://github.com/Gapminder/waffle-server/commit/cd085ee))
* **ws-tests:** added a cache for requested commits ([caa0cda](https://github.com/Gapminder/waffle-server/commit/caa0cda))



<a name="1.2.0"></a>
# [1.2.0](https://github.com/Gapminder/waffle-server/compare/v1.1.2...v1.2.0) (2016-11-04)


### Bug Fixes

* **ddfql:** add trasaction.commit to rawDdf in pack.service ([ca4098b](https://github.com/Gapminder/waffle-server/commit/ca4098b))
* **ddfql:** change version to have value transaction.commit ([367b89f](https://github.com/Gapminder/waffle-server/commit/367b89f))
* **deployment:** escape mongo url ([0611aff](https://github.com/Gapminder/waffle-server/commit/0611aff))
* **e2e:** make e2e tests verify only rows and headers ([1112a5a](https://github.com/Gapminder/waffle-server/commit/1112a5a))
* **wsJson:** return dataset name under 'dataset' property rather than 'name' ([749405a](https://github.com/Gapminder/waffle-server/commit/749405a))


### Features

* **ddf importing:** import ddf datapoints via streams ([3528899](https://github.com/Gapminder/waffle-server/commit/3528899))
* **ddf-import:** remove original entities ([ebfd58d](https://github.com/Gapminder/waffle-server/commit/ebfd58d))
* **ddfql:** add dataset name and version to response in  wsJson format ([1a65e3d](https://github.com/Gapminder/waffle-server/commit/1a65e3d))
* **inc-update:** handle translations in incremental update process ([5544cfd](https://github.com/Gapminder/waffle-server/commit/5544cfd))
* **mongoose-models:** add required fields to mongoose models for support ddf translations ([e63580a](https://github.com/Gapminder/waffle-server/commit/e63580a))
* **translations:** add translations processing to import frlow ([ebb3fad](https://github.com/Gapminder/waffle-server/commit/ebb3fad))



<a name="1.1.2"></a>
## [1.1.2](https://github.com/Gapminder/waffle-server/compare/v1.1.1...v1.1.2) (2016-10-31)


### Bug Fixes

* **test:** update e2e dataset commits ([8d8770e](https://github.com/Gapminder/waffle-server/commit/8d8770e))


### Features

* **log:** add env markers to log messages ([88d446a](https://github.com/Gapminder/waffle-server/commit/88d446a))



<a name="1.1.1"></a>
## [1.1.1](https://github.com/Gapminder/waffle-server/compare/v1.1.0...v1.1.1) (2016-10-26)


### Bug Fixes

* **deployment:** escape mongo url ([6fdb35e](https://github.com/Gapminder/waffle-server/commit/6fdb35e))



<a name="1.1.0"></a>
# [1.1.0](https://github.com/Gapminder/waffle-server/compare/v1.0.0...v1.1.0) (2016-10-26)


### Bug Fixes

* **data-points.repository:** fix max, min, avg stats calculation ([deba584](https://github.com/Gapminder/waffle-server/commit/deba584))
* **ddfql:** fix some bug after incremental update ([d74dbaa](https://github.com/Gapminder/waffle-server/commit/d74dbaa))
* **ddfql:** fix some bug after incremental update ([3cc086f](https://github.com/Gapminder/waffle-server/commit/3cc086f))
* **ddfql:** fix some bug after incremental update ([9c12dc3](https://github.com/Gapminder/waffle-server/commit/9c12dc3))
* **ddfql:** fix some bug after incremental update ([f276be0](https://github.com/Gapminder/waffle-server/commit/f276be0))
* **ddfql:** fix typeError Cannot read property hasOwnProperty of undefined when POST request with select ([3455827](https://github.com/Gapminder/waffle-server/commit/3455827))
* **ddfql:** fix typeError Cannot read property hasOwnProperty of undefined when POST request with select ([a21bad7](https://github.com/Gapminder/waffle-server/commit/a21bad7))
* **ddfql:** fix typeError Cannot read property hasOwnProperty of undefined when POST request with select ([321324b](https://github.com/Gapminder/waffle-server/commit/321324b))
* **ddfql:** fix typeError Cannot read property hasOwnProperty of undefined when POST request with select ([01a5d14](https://github.com/Gapminder/waffle-server/commit/01a5d14))
* **ddfql-parser:** fix bug with queries of absent DATE time type by ddfql datapoint queries ([2ed6d9c](https://github.com/Gapminder/waffle-server/commit/2ed6d9c))
* **ddfql-parser:** refactor ddfql parser for datapoints, entities, concepts for reusing common functions ([704f3c6](https://github.com/Gapminder/waffle-server/commit/704f3c6))
* **ddfql-parser:** support complex entity clause for datapoints queries ([9d4576a](https://github.com/Gapminder/waffle-server/commit/9d4576a))
* **ddfql-parser:** support complex entity clause for datapoints queries ([f06c716](https://github.com/Gapminder/waffle-server/commit/f06c716))
* **pack-ws.processor:**  treat 0 as numbers ([b1c34cf](https://github.com/Gapminder/waffle-server/commit/b1c34cf))


### Features

* **ddfql:** Change new commit ([97f7f3c](https://github.com/Gapminder/waffle-server/commit/97f7f3c))
* **ddfql:** Change new commit ([701ade7](https://github.com/Gapminder/waffle-server/commit/701ade7))
* **ddfql:** Change new commit ([02379db](https://github.com/Gapminder/waffle-server/commit/02379db))
* **ddfql:** Change new commit ([a5b79ad](https://github.com/Gapminder/waffle-server/commit/a5b79ad))
* **ddfql:** Check GET request: datapoints with select=sg_population&key=geo,time ([8588310](https://github.com/Gapminder/waffle-server/commit/8588310))
* **ddfql:** Check GET request: datapoints with select=sg_population&key=geo,time ([deddf59](https://github.com/Gapminder/waffle-server/commit/deddf59))
* **ddfql:** Check GET request: datapoints with select=sg_population&key=geo,time ([56de1a0](https://github.com/Gapminder/waffle-server/commit/56de1a0))
* **ddfql:** Check GET request: datapoints with select=sg_population&key=geo,time ([a848ea4](https://github.com/Gapminder/waffle-server/commit/a848ea4))
* **ddfql:** Check GET request: for entities with selected format=json&key=geo&geo.is--country=true ([cc5c005](https://github.com/Gapminder/waffle-server/commit/cc5c005))
* **ddfql:** Check GET request: for entities with selected format=json&key=geo&geo.is--country=true ([f934ef2](https://github.com/Gapminder/waffle-server/commit/f934ef2))
* **ddfql:** Check GET request: for entities with selected format=json&key=geo&geo.is--country=true ([10d93a7](https://github.com/Gapminder/waffle-server/commit/10d93a7))
* **ddfql:** Check GET request: for entities with selected format=json&key=geo&geo.is--country=true ([712fb39](https://github.com/Gapminder/waffle-server/commit/712fb39))
* **ddfql:** Check GET request: for entitieswith selected format=wsJson|ddfJson ([8d3673a](https://github.com/Gapminder/waffle-server/commit/8d3673a))
* **ddfql:** Check GET request: for entitieswith selected format=wsJson|ddfJson ([92b3403](https://github.com/Gapminder/waffle-server/commit/92b3403))
* **ddfql:** Check GET request: for entitieswith selected format=wsJson|ddfJson ([0e90fe3](https://github.com/Gapminder/waffle-server/commit/0e90fe3))
* **ddfql:** Check GET request: for entitieswith selected format=wsJson|ddfJson ([5a8bf70](https://github.com/Gapminder/waffle-server/commit/5a8bf70))
* **ddfql:** correct stub data for new commits on GET requests ([72f7771](https://github.com/Gapminder/waffle-server/commit/72f7771))
* **ddfql:** correct stub data for new commits on GET requests ([b7d6bac](https://github.com/Gapminder/waffle-server/commit/b7d6bac))
* **ddfql:** correct stub data for new commits on GET requests ([828534c](https://github.com/Gapminder/waffle-server/commit/828534c))
* **ddfql:** correct stub data for new commits on GET requests ([7bbf60e](https://github.com/Gapminder/waffle-server/commit/7bbf60e))
* **ddfql:** create POST entities with select for all formats ([8a05475](https://github.com/Gapminder/waffle-server/commit/8a05475))
* **ddfql:** create POST entities with select for all formats ([1113c1e](https://github.com/Gapminder/waffle-server/commit/1113c1e))
* **ddfql:** create POST entities with select for all formats ([f561ee2](https://github.com/Gapminder/waffle-server/commit/f561ee2))
* **ddfql:** create POST entities with select for all formats ([ebb1ef1](https://github.com/Gapminder/waffle-server/commit/ebb1ef1))
* **ddfql:** create test for POST request when select from:"concepts" ([cbc3413](https://github.com/Gapminder/waffle-server/commit/cbc3413))
* **ddfql:** create test for POST request when select from:"concepts" ([830598b](https://github.com/Gapminder/waffle-server/commit/830598b))
* **ddfql:** create test for POST request when select from:"concepts" ([8a31d37](https://github.com/Gapminder/waffle-server/commit/8a31d37))
* **ddfql:** create test for POST request when select from:"concepts" ([8127fb0](https://github.com/Gapminder/waffle-server/commit/8127fb0))
* **ddfql:** create tests for concepts|entities|datapoints schemas ([8cbbf59](https://github.com/Gapminder/waffle-server/commit/8cbbf59))
* **ddfql:** create tests for concepts|entities|datapoints schemas ([2675bd6](https://github.com/Gapminder/waffle-server/commit/2675bd6))
* **ddfql:** create tests for concepts|entities|datapoints schemas ([7061f72](https://github.com/Gapminder/waffle-server/commit/7061f72))
* **ddfql:** create tests for concepts|entities|datapoints schemas ([52dac1c](https://github.com/Gapminder/waffle-server/commit/52dac1c))
* **ddfql:** create tests for datapoints with right select ([138e321](https://github.com/Gapminder/waffle-server/commit/138e321))
* **ddfql:** create tests for datapoints with right select ([738ec35](https://github.com/Gapminder/waffle-server/commit/738ec35))
* **ddfql:** create tests for datapoints with right select ([1d431c9](https://github.com/Gapminder/waffle-server/commit/1d431c9))
* **ddfql:** create tests for datapoints with right select ([ade6386](https://github.com/Gapminder/waffle-server/commit/ade6386))
* **ddfql:** create tests for datapoints without query params ([7ac1ece](https://github.com/Gapminder/waffle-server/commit/7ac1ece))
* **ddfql:** create tests for datapoints without query params ([9b32667](https://github.com/Gapminder/waffle-server/commit/9b32667))
* **ddfql:** create tests for datapoints without query params ([dcd8def](https://github.com/Gapminder/waffle-server/commit/dcd8def))
* **ddfql:** create tests for datapoints without query params ([7b783fb](https://github.com/Gapminder/waffle-server/commit/7b783fb))
* **ddfql:** create tests for entities POST request ([dc125e8](https://github.com/Gapminder/waffle-server/commit/dc125e8))
* **ddfql:** create tests for entities POST request ([75fbbee](https://github.com/Gapminder/waffle-server/commit/75fbbee))
* **ddfql:** create tests for entities POST request ([f2265b0](https://github.com/Gapminder/waffle-server/commit/f2265b0))
* **ddfql:** create tests for entities POST request ([1068597](https://github.com/Gapminder/waffle-server/commit/1068597))
* **ddfql:** create tests on get request for entities all commits ([722bcf9](https://github.com/Gapminder/waffle-server/commit/722bcf9))
* **ddfql:** create tests on get request for entities all commits ([bacc0aa](https://github.com/Gapminder/waffle-server/commit/bacc0aa))
* **ddfql:** create tests on get request for entities all commits ([6427fe7](https://github.com/Gapminder/waffle-server/commit/6427fe7))
* **ddfql:** create tests on get request for entities all commits ([b2ca540](https://github.com/Gapminder/waffle-server/commit/b2ca540))
* **ddfql:** create tests on get request for entities first commit ([4888d5d](https://github.com/Gapminder/waffle-server/commit/4888d5d))
* **ddfql:** create tests on get request for entities first commit ([eec2a1f](https://github.com/Gapminder/waffle-server/commit/eec2a1f))
* **ddfql:** create tests on get request for entities first commit ([d51a509](https://github.com/Gapminder/waffle-server/commit/d51a509))
* **ddfql:** create tests on get request for entities first commit ([bbb0111](https://github.com/Gapminder/waffle-server/commit/bbb0111))
* **ddfql:** create tests on get requesta for datapoints ([2cb9f47](https://github.com/Gapminder/waffle-server/commit/2cb9f47))
* **ddfql:** create tests on get requesta for datapoints ([a5e2099](https://github.com/Gapminder/waffle-server/commit/a5e2099))
* **ddfql:** create tests on get requesta for datapoints ([887a917](https://github.com/Gapminder/waffle-server/commit/887a917))
* **ddfql:** create tests on get requesta for datapoints ([6b43583](https://github.com/Gapminder/waffle-server/commit/6b43583))
* **ddfql:** Create tests on POST request for concepts|datapoints|entities routes ([44b0d14](https://github.com/Gapminder/waffle-server/commit/44b0d14))
* **ddfql:** Create tests on POST request for concepts|datapoints|entities routes ([a581464](https://github.com/Gapminder/waffle-server/commit/a581464))
* **ddfql:** Create tests on POST request for concepts|datapoints|entities routes ([31bc6bc](https://github.com/Gapminder/waffle-server/commit/31bc6bc))
* **ddfql:** Create tests on POST request for concepts|datapoints|entities routes ([46f2946](https://github.com/Gapminder/waffle-server/commit/46f2946))
* **ddfql:** create tests on POST request for datapoints without select ([5419d76](https://github.com/Gapminder/waffle-server/commit/5419d76))
* **ddfql:** create tests on POST request for datapoints without select ([c947461](https://github.com/Gapminder/waffle-server/commit/c947461))
* **ddfql:** create tests on POST request for datapoints without select ([a9f4da6](https://github.com/Gapminder/waffle-server/commit/a9f4da6))
* **ddfql:** create tests on POST request for datapoints without select ([b877fc3](https://github.com/Gapminder/waffle-server/commit/b877fc3))
* **ddfql:** Create tests on POST requests for concept|datapoints|entities schemas ([6fe07c8](https://github.com/Gapminder/waffle-server/commit/6fe07c8))
* **ddfql:** Create tests on POST requests for concept|datapoints|entities schemas ([7b2e3d5](https://github.com/Gapminder/waffle-server/commit/7b2e3d5))
* **ddfql:** Create tests on POST requests for concept|datapoints|entities schemas ([467cda5](https://github.com/Gapminder/waffle-server/commit/467cda5))
* **ddfql:** Create tests on POST requests for concept|datapoints|entities schemas ([680b5e7](https://github.com/Gapminder/waffle-server/commit/680b5e7))
* **ddfql:** create tests with select wrong  column for POST datapoints ([de24f3b](https://github.com/Gapminder/waffle-server/commit/de24f3b))
* **ddfql:** create tests with select wrong  column for POST datapoints ([bb73e4e](https://github.com/Gapminder/waffle-server/commit/bb73e4e))
* **ddfql:** create tests with select wrong  column for POST datapoints ([9c315bf](https://github.com/Gapminder/waffle-server/commit/9c315bf))
* **ddfql:** create tests with select wrong  column for POST datapoints ([b2c62e2](https://github.com/Gapminder/waffle-server/commit/b2c62e2))
* **ddfql:** POST entities without select ([b36e41e](https://github.com/Gapminder/waffle-server/commit/b36e41e))
* **ddfql:** POST entities without select ([f65c71c](https://github.com/Gapminder/waffle-server/commit/f65c71c))
* **ddfql:** POST entities without select ([bd15826](https://github.com/Gapminder/waffle-server/commit/bd15826))
* **ddfql:** POST entities without select ([d76e66f](https://github.com/Gapminder/waffle-server/commit/d76e66f))
* **ddfql:** separate routes.test to ddfql.without.datasets.test and ddfql.with.datasets.test ([84481d8](https://github.com/Gapminder/waffle-server/commit/84481d8))
* **ddfql:** separate routes.test to ddfql.without.datasets.test and ddfql.with.datasets.test ([411f09f](https://github.com/Gapminder/waffle-server/commit/411f09f))
* **ddfql:** separate routes.test to ddfql.without.datasets.test and ddfql.with.datasets.test ([a57f041](https://github.com/Gapminder/waffle-server/commit/a57f041))
* **ddfql:** separate routes.test to ddfql.without.datasets.test and ddfql.with.datasets.test ([47e49ef](https://github.com/Gapminder/waffle-server/commit/47e49ef))
* **ddfql-controller:** add integration tests for ddfql ([07d3f6a](https://github.com/Gapminder/waffle-server/commit/07d3f6a))
* **ddfql-controller:** add integration tests for ddfql ([3a62b22](https://github.com/Gapminder/waffle-server/commit/3a62b22))
* **ddfql-controller:** add integration tests for ddfql ([99adb37](https://github.com/Gapminder/waffle-server/commit/99adb37))
* **ddfql-controller:** add integration tests for ddfql ([00cc7d8](https://github.com/Gapminder/waffle-server/commit/00cc7d8))
* **ddfql-parser:** create unit tests for concepts queries ([e0a708d](https://github.com/Gapminder/waffle-server/commit/e0a708d))
* **ddfql-parser:** create unit tests for entities queries ([566abe8](https://github.com/Gapminder/waffle-server/commit/566abe8))
* **ddfql-parser:** create unit tests for entities queries ([ee00540](https://github.com/Gapminder/waffle-server/commit/ee00540))
* **ddfql-parser:** extend domain parsing in select ([99c2422](https://github.com/Gapminder/waffle-server/commit/99c2422))
* **transaction-model:** add spent time in millis to transaction model ([3f0343a](https://github.com/Gapminder/waffle-server/commit/3f0343a))
* **unit-tests:** upgrade unit testing infrastructure ([56d25a6](https://github.com/Gapminder/waffle-server/commit/56d25a6))



<a name="1.0.0"></a>
# [1.0.0](https://github.com/Gapminder/waffle-server/compare/v0.3.0...v1.0.0) (2016-10-03)


### Bug Fixes

* **auth:**  make it possible to share token for couple login sessions ([66a4e11](https://github.com/Gapminder/waffle-server/commit/66a4e11))
* **auth:**  prolong user session each time it touches WS if session is not stale ([d71a071](https://github.com/Gapminder/waffle-server/commit/d71a071))
* **auth,repos:**  fix repo name processing, auth ([a09af97](https://github.com/Gapminder/waffle-server/commit/a09af97))
* **auth,rollback:** add default user as workaround for not having registration, delete dataset without versions on rollback ([8f2e7cf](https://github.com/Gapminder/waffle-server/commit/8f2e7cf))
* **cache, indexes:** fix issues with entity query performance, hit the cache ([a69c812](https://github.com/Gapminder/waffle-server/commit/a69c812))
* **cli.controller:**  log all the errors the are passed to ws-cli ([c4f5b2c](https://github.com/Gapminder/waffle-server/commit/c4f5b2c))
* **cli.controller:** fix branch checkout and import validation ([c094a13](https://github.com/Gapminder/waffle-server/commit/c094a13))
* **cli.controller:** fix versions returned by prestored queries ([61e619e](https://github.com/Gapminder/waffle-server/commit/61e619e))
* **cli.controller:** modify 'result overview' route, datapoints route ([b211c76](https://github.com/Gapminder/waffle-server/commit/b211c76))
* **cli.controller:** modify 'result overview' route, fix dataset update functionality ([33087d9](https://github.com/Gapminder/waffle-server/commit/33087d9))
* **cli.controller:** unify response format ([3932eae](https://github.com/Gapminder/waffle-server/commit/3932eae))
* **cli.service:**  use "datapointlessMode" in ddf-validation in order to avoid timeout expiration in cli tool ([6b3da6e](https://github.com/Gapminder/waffle-server/commit/6b3da6e))
* **cli.service:** release cli tool as soon as transaction and dataset are created ([a63d20b](https://github.com/Gapminder/waffle-server/commit/a63d20b))
* **concepts inc update:** fix searching for previous concept version ([d97596c](https://github.com/Gapminder/waffle-server/commit/d97596c))
* **concepts-service:** fix requested value of the key in concepts service ([f59eb38](https://github.com/Gapminder/waffle-server/commit/f59eb38))
* **cors:** fix ddfql route ([43d79c9](https://github.com/Gapminder/waffle-server/commit/43d79c9))
* **datapoint-controller:** fix query wrapper ([d92abfd](https://github.com/Gapminder/waffle-server/commit/d92abfd))
* **datapoints-service:** fix datapoint response ([52c4a43](https://github.com/Gapminder/waffle-server/commit/52c4a43))
* **datapoints.service:** access datapoints length in a safe manner ([94cea26](https://github.com/Gapminder/waffle-server/commit/94cea26))
* **dataset commits:** send dataset's commits in reversed order - from oldest to latest ([666f678](https://github.com/Gapminder/waffle-server/commit/666f678))
* **dataset commits:** send dataset's commits in reversed order - from oldest to latest ([4d3e114](https://github.com/Gapminder/waffle-server/commit/4d3e114))
* **ddf query validator:**  add constraint to no have more than five measures in select for datapoints ([48724bd](https://github.com/Gapminder/waffle-server/commit/48724bd))
* **ddf-endpoints:** serve data only for properly closed transactions ([80879cd](https://github.com/Gapminder/waffle-server/commit/80879cd))
* **ddf-entities-query-normalizer:** handle entities despite their type (by using gid) ([166c379](https://github.com/Gapminder/waffle-server/commit/166c379))
* **ddf-query-utils:** fix join section parsing crash if time filter is empty ([aabda51](https://github.com/Gapminder/waffle-server/commit/aabda51))
* **ddfql normalizers:** make query transformations resistant to absent query props ([5340f84](https://github.com/Gapminder/waffle-server/commit/5340f84))
* **ddfql normalizers:** make query transformations resistant to absent query props ([dddc206](https://github.com/Gapminder/waffle-server/commit/dddc206))
* **ddfql-controller:** fix error with unexpected domain of requested entities ([0cf7a40](https://github.com/Gapminder/waffle-server/commit/0cf7a40))
* **debug:** remove debug information ([2539c14](https://github.com/Gapminder/waffle-server/commit/2539c14))
* **demo.service:** add validation function to _findDataset method ([f3be1d6](https://github.com/Gapminder/waffle-server/commit/f3be1d6))
* **demo.service:** pass app to service in incremental update - just a workaround for now ([b04a0a7](https://github.com/Gapminder/waffle-server/commit/b04a0a7))
* **entities-stats:** update query processing for entities stats ([fd7874f](https://github.com/Gapminder/waffle-server/commit/fd7874f))
* **export:** fix function name ([7333388](https://github.com/Gapminder/waffle-server/commit/7333388))
* **export:** fix indeces ([0dabe3f](https://github.com/Gapminder/waffle-server/commit/0dabe3f))
* **export:** update models loading because of models renaming ([4147ea8](https://github.com/Gapminder/waffle-server/commit/4147ea8))
* **import:** fix mappings ([f994a7a](https://github.com/Gapminder/waffle-server/commit/f994a7a))
* **inc update:** populate gid properly when entity changes ([43c5811](https://github.com/Gapminder/waffle-server/commit/43c5811))
* **inc-update:** make sure datapoint values are compared correctly, don't allow to rollback 'in progress' transaction ([80ecb08](https://github.com/Gapminder/waffle-server/commit/80ecb08))
* **incremental update:** adapt import and export to incremental updates ([73a7682](https://github.com/Gapminder/waffle-server/commit/73a7682))
* **incremental-update:** fix closing datapoints, entities, concepts ([a5d8f44](https://github.com/Gapminder/waffle-server/commit/a5d8f44))
* **incremental-update:** fix matching measures and dimensions from existed concepts and from removed concepts from last completed version ([83fe4e4](https://github.com/Gapminder/waffle-server/commit/83fe4e4))
* **join:** fix error process of join property in where ([494f321](https://github.com/Gapminder/waffle-server/commit/494f321))
* **metadata,translations:** update meta and translations to the latest semio's versions ([86b0441](https://github.com/Gapminder/waffle-server/commit/86b0441))
* **mongo queries:**  change query params order in counting entities, concepts, datapoints so that index was used ([0a31669](https://github.com/Gapminder/waffle-server/commit/0a31669))
* **mongo queries:**  enable index utilization by WS queries ([7d08f1c](https://github.com/Gapminder/waffle-server/commit/7d08f1c))
* **newrelic.js:** remove license key from newrelic.js (it should be set up via environment variable) ([27ce3c3](https://github.com/Gapminder/waffle-server/commit/27ce3c3))
* **pack-ddf-processor:** fix packing ddf geo/time properties ([203d3a5](https://github.com/Gapminder/waffle-server/commit/203d3a5))
* **pack-ws.processor:** improve performance of wsJson processing ([b58e21c](https://github.com/Gapminder/waffle-server/commit/b58e21c))
* **package:** update packages ([25461c9](https://github.com/Gapminder/waffle-server/commit/25461c9))
* **package.json:** add missing dependency ([ca4e239](https://github.com/Gapminder/waffle-server/commit/ca4e239))
* **poulate model:** fix models add script for db population ([3aa2609](https://github.com/Gapminder/waffle-server/commit/3aa2609))
* **poulate model:** fix models add script for db population ([8736ae4](https://github.com/Gapminder/waffle-server/commit/8736ae4))
* **repos.service,import:** make repos.service chekout dataset to given commit, fix issues with entity importing ([e5b5f27](https://github.com/Gapminder/waffle-server/commit/e5b5f27))
* **route-repos:** working with test dir ([ca0679c](https://github.com/Gapminder/waffle-server/commit/ca0679c))
* update mapper of Entity model (domain) ([1c0e2fe](https://github.com/Gapminder/waffle-server/commit/1c0e2fe))
* **stats:** disable stats cache invalidation ([4c20f2d](https://github.com/Gapminder/waffle-server/commit/4c20f2d))
* **stats:** respond with an error when one requests unexisting dataset or version ([a2c971d](https://github.com/Gapminder/waffle-server/commit/a2c971d))
* **swagger:** remove invalid swagger comments ([451eab1](https://github.com/Gapminder/waffle-server/commit/451eab1))
* **translations:**  add measure constraint to datapoints query ([25de116](https://github.com/Gapminder/waffle-server/commit/25de116))
* **translations:**  don't try to translate strings if dictionary is empty ([b30c6cb](https://github.com/Gapminder/waffle-server/commit/b30c6cb))
* **translations:** make vizabi strings stored in the mongodb ([58303fd](https://github.com/Gapminder/waffle-server/commit/58303fd))
* **translations:** use proper indexed and do not allow to translate numbers ([7ed74da](https://github.com/Gapminder/waffle-server/commit/7ed74da))
* **unpack-processor:** fix unpack processor for datapoints ([1d33b1b](https://github.com/Gapminder/waffle-server/commit/1d33b1b))
* **validation:** enable indexless mode for WS validation ([4233f50](https://github.com/Gapminder/waffle-server/commit/4233f50))


### Features

* **auth:** add password hashing ([92a0eff](https://github.com/Gapminder/waffle-server/commit/92a0eff))
* **cleaning:** clean code ([e162756](https://github.com/Gapminder/waffle-server/commit/e162756))
* **cli.controller:** add authentication support ([ea8614c](https://github.com/Gapminder/waffle-server/commit/ea8614c))
* **cli.controller:** add routes for rollback activation and transaction status grabbing ([0ec842e](https://github.com/Gapminder/waffle-server/commit/0ec842e))
* **cli.controller:** process diffs via streams ([ae8991e](https://github.com/Gapminder/waffle-server/commit/ae8991e))
* **cli.service:** add ddf validation for cloned ddf repo before dataset importing/updating ([0e4c39e](https://github.com/Gapminder/waffle-server/commit/0e4c39e))
* **concept-props:** create route for concept props ([88af5de](https://github.com/Gapminder/waffle-server/commit/88af5de))
* **concept-time:** add supporting concept_type time ([569ea27](https://github.com/Gapminder/waffle-server/commit/569ea27))
* **concepts incremental update:** add support of incremental concepts update ([29effe1](https://github.com/Gapminder/waffle-server/commit/29effe1))
* **concepts.repository:** add method for finding concepts properties ([16f4aa3](https://github.com/Gapminder/waffle-server/commit/16f4aa3))
* **controllers:** create controller and service for concepts ([a62a233](https://github.com/Gapminder/waffle-server/commit/a62a233))
* **controllers:** separate controllers by ddf types ([59c2eee](https://github.com/Gapminder/waffle-server/commit/59c2eee))
* **create:** create new route to get clone repository ([86b9aec](https://github.com/Gapminder/waffle-server/commit/86b9aec))
* **create:** create routes with usage mongodb collection, all real documents from db ([c120332](https://github.com/Gapminder/waffle-server/commit/c120332))
* **data processing routing:** route income data for formatting based on ddf type ([8ac6b55](https://github.com/Gapminder/waffle-server/commit/8ac6b55))
* **data-models:** create and update data models for ddf format ([d4f29a4](https://github.com/Gapminder/waffle-server/commit/d4f29a4))
* **data-models:** create data models for ddf format ([3b741f2](https://github.com/Gapminder/waffle-server/commit/3b741f2))
* **data-models:** create data models for ddf format ([f612519](https://github.com/Gapminder/waffle-server/commit/f612519))
* **data-points:** add data-points processing to import ([8195d96](https://github.com/Gapminder/waffle-server/commit/8195d96))
* **data-points:** add incremental update for data points ([9d47ec4](https://github.com/Gapminder/waffle-server/commit/9d47ec4))
* **datapoint-controller:** create route with supporting ddfql ([c7ee350](https://github.com/Gapminder/waffle-server/commit/c7ee350))
* **datapoint-controller:** proof of concept ddfql for datapoints ([fd475eb](https://github.com/Gapminder/waffle-server/commit/fd475eb))
* **datapoint-normalizer:** add join links generation base on where clause ([35ae9cc](https://github.com/Gapminder/waffle-server/commit/35ae9cc))
* **datapoint-normalizer:** add join links generation base on where clause ([1716f07](https://github.com/Gapminder/waffle-server/commit/1716f07))
* **datapoints-controller:** update select syntax {select: {key: [one, two], value: [three]}} ([33dc54a](https://github.com/Gapminder/waffle-server/commit/33dc54a))
* **datapoints-service:** add entities filtering in datapoints service ([f01bec2](https://github.com/Gapminder/waffle-server/commit/f01bec2))
* **datapoints-service:** proof of concept for querying datapoints ([585da6f](https://github.com/Gapminder/waffle-server/commit/585da6f))
* **datapoints-service:** support GET and POST queries to datapoints ([fdcaeeb](https://github.com/Gapminder/waffle-server/commit/fdcaeeb))
* **dataset import and update:**  include github account name into dataset name ([86244dc](https://github.com/Gapminder/waffle-server/commit/86244dc))
* **dataset-indexes:** dynamic generation of ddf-indexes ([1466d5d](https://github.com/Gapminder/waffle-server/commit/1466d5d))
* **dataset-indexes:** integration into incremental update process ([d44b85e](https://github.com/Gapminder/waffle-server/commit/d44b85e))
* **dataset-indexes:** refactor implementation, codereview ([91b6d8d](https://github.com/Gapminder/waffle-server/commit/91b6d8d))
* **dataset-indexes:** support of dataset-indexes added into import process ([8393800](https://github.com/Gapminder/waffle-server/commit/8393800))
* **dataset-transactions.service:** add service to work with transactions ([ee8e763](https://github.com/Gapminder/waffle-server/commit/ee8e763))
* **DatasetTransactions:** attach last error happened (if any) to a transaction ([415c429](https://github.com/Gapminder/waffle-server/commit/415c429))
* **ddf models:** add Concepts mongo model ([fd69f21](https://github.com/Gapminder/waffle-server/commit/fd69f21))
* **ddf models:** add Concepts mongo model ([4bdd796](https://github.com/Gapminder/waffle-server/commit/4bdd796))
* **ddf models:** add Versions mongoose model ([3a2a745](https://github.com/Gapminder/waffle-server/commit/3a2a745))
* **ddf models:** add Versions mongoose model ([2a8f20a](https://github.com/Gapminder/waffle-server/commit/2a8f20a))
* **ddf-import:** support new file format for datapoints ([bf0731e](https://github.com/Gapminder/waffle-server/commit/bf0731e))
* **ddf-models:** update all models according to versioning and incremental updates ([0085e4a](https://github.com/Gapminder/waffle-server/commit/0085e4a))
* **ddf-response:** create 2 ddf format post processors ([89bf4b0](https://github.com/Gapminder/waffle-server/commit/89bf4b0)), closes [#258](https://github.com/Gapminder/waffle-server/issues/258)
* **ddfql:** add ddf query normalizer - this facilitates ddf query translation to mongodb query ([86a1547](https://github.com/Gapminder/waffle-server/commit/86a1547))
* **ddfql:** add support of "order_by" clause ([8cf53f6](https://github.com/Gapminder/waffle-server/commit/8cf53f6))
* **ddfql:** create new ddf query normalizer for concepts ([7cc32dd](https://github.com/Gapminder/waffle-server/commit/7cc32dd))
* **ddfql:** create new ddf query normalizer for entities ([e68c6d8](https://github.com/Gapminder/waffle-server/commit/e68c6d8))
* **ddfql-controller:** add supporting select key in where clause with dot notation for entities ([c6b5edd](https://github.com/Gapminder/waffle-server/commit/c6b5edd))
* **ddfql-controller:** add unified endpoint for ddfql queries (POST) ([86d9411](https://github.com/Gapminder/waffle-server/commit/86d9411))
* **ddfql-query-validator:** add validation of ddfql query ([f5b3255](https://github.com/Gapminder/waffle-server/commit/f5b3255))
* **default dataset:** add ability to set default dataset and serve data accordingly ([d664aad](https://github.com/Gapminder/waffle-server/commit/d664aad))
* **demo-controller:** devide demo.controller into service and controller ([a4ac4c6](https://github.com/Gapminder/waffle-server/commit/a4ac4c6))
* **docker:** create docker config ([ce1ca44](https://github.com/Gapminder/waffle-server/commit/ce1ca44))
* **drill-up-down:** update concepts drillups, drilldowns, domains ([eb7eba5](https://github.com/Gapminder/waffle-server/commit/eb7eba5))
* **drill-up-down:** update import prototype for working with drill_up drill_down properties ([20deff2](https://github.com/Gapminder/waffle-server/commit/20deff2))
* **entities-controller:** update key syntax ([ebf4480](https://github.com/Gapminder/waffle-server/commit/ebf4480))
* **entities-controller:** update select syntax {select: {key: one, value: [two, three]}} ([3a3e159](https://github.com/Gapminder/waffle-server/commit/3a3e159))
* **entities-query-normalizer:** add supporting substitute entity join links ([966c618](https://github.com/Gapminder/waffle-server/commit/966c618))
* **entities-query-normalizer:** update entities query normalizer ([2159d81](https://github.com/Gapminder/waffle-server/commit/2159d81))
* **entities.repository:** add method for querying entity property, add base for concepts repository, add route for getting latest version of the given dataset ([19e3db9](https://github.com/Gapminder/waffle-server/commit/19e3db9))
* **entity-model:** change type of the value field for Entity model ([a17892b](https://github.com/Gapminder/waffle-server/commit/a17892b))
* **entity-normalizer:** add support different time types in join and where clause ([2dd5054](https://github.com/Gapminder/waffle-server/commit/2dd5054))
* **entity-normalizer:** add support different time types in join and where clause ([2aae208](https://github.com/Gapminder/waffle-server/commit/2aae208))
* **export:** add datapoints incremental export ([6fe5486](https://github.com/Gapminder/waffle-server/commit/6fe5486))
* **export:** add properties to nodes ([57b92bb](https://github.com/Gapminder/waffle-server/commit/57b92bb))
* **export:** export data tree along with concept tree ([992867a](https://github.com/Gapminder/waffle-server/commit/992867a))
* **export:** export Datapoints ([6f9edfc](https://github.com/Gapminder/waffle-server/commit/6f9edfc))
* **export:** export EntityGroups ([7c9533a](https://github.com/Gapminder/waffle-server/commit/7c9533a))
* **export:** export measures ([395ae94](https://github.com/Gapminder/waffle-server/commit/395ae94))
* **export:** export neo "data tree" and "meta tree" with versioning and incremental update support ([eeb75e0](https://github.com/Gapminder/waffle-server/commit/eeb75e0))
* **export:** export translations, concepts, dataset, version ([60cb6f7](https://github.com/Gapminder/waffle-server/commit/60cb6f7))
* **export:** init commit ([c5fc1cf](https://github.com/Gapminder/waffle-server/commit/c5fc1cf))
* **export:** make WITH_CURRENT_VERSION relation ([8bcf48d](https://github.com/Gapminder/waffle-server/commit/8bcf48d))
* **export:** make WITH_CURRENT_VERSION relation ([5cc61ba](https://github.com/Gapminder/waffle-server/commit/5cc61ba))
* **export:** single tree ([b1f9385](https://github.com/Gapminder/waffle-server/commit/b1f9385))
* **export:** two tree-exporting ([fdc3409](https://github.com/Gapminder/waffle-server/commit/fdc3409))
* **export:** two tree-exporting - data tree - entity groups ([2e05989](https://github.com/Gapminder/waffle-server/commit/2e05989))
* **export:** two tree-exporting - data tree is reused from old export ([2373ac3](https://github.com/Gapminder/waffle-server/commit/2373ac3))
* **export:** wire Entities with corresponding EntityGroups via CONTAINS relation ([97c65f1](https://github.com/Gapminder/waffle-server/commit/97c65f1))
* **import-ddf:** update import data points in ddf data ([4a7c1c0](https://github.com/Gapminder/waffle-server/commit/4a7c1c0))
* **importer:** fix minor bugs ([f13f1d1](https://github.com/Gapminder/waffle-server/commit/f13f1d1))
* **importer:** fix trim filename and check measures ([19e1150](https://github.com/Gapminder/waffle-server/commit/19e1150))
* **importer:** fix updating concept dimension in importer ([583b336](https://github.com/Gapminder/waffle-server/commit/583b336))
* **importer:** move all common functions to common.js ([7f01a19](https://github.com/Gapminder/waffle-server/commit/7f01a19))
* **importer:** update common.js ([db9ec48](https://github.com/Gapminder/waffle-server/commit/db9ec48))
* **importer:** update ddf importer for import full stub ([daa6a46](https://github.com/Gapminder/waffle-server/commit/daa6a46))
* **inc-update:** add functions for incremental update entities ([07b464b](https://github.com/Gapminder/waffle-server/commit/07b464b))
* **inc-update:** add to incremental update checkingof dataset locking ([9fc9d53](https://github.com/Gapminder/waffle-server/commit/9fc9d53))
* **incremental-update:** add data point incremental update ([caaf401](https://github.com/Gapminder/waffle-server/commit/caaf401))
* **meta and translations:**  make it possible to update translation strings and meta in realtime ([6ccae4b](https://github.com/Gapminder/waffle-server/commit/6ccae4b))
* **metadata:** update metadata.json and en.json ([f84f0e6](https://github.com/Gapminder/waffle-server/commit/f84f0e6))
* **metadata-json:** update colors for some concepts in metadata.json ([d64c831](https://github.com/Gapminder/waffle-server/commit/d64c831))
* **metadata-json:** update colors for some concepts in metadata.json ([5898787](https://github.com/Gapminder/waffle-server/commit/5898787))
* **mongo-models:** update indexes for mongo models ([ed22cb4](https://github.com/Gapminder/waffle-server/commit/ed22cb4))
* **newrelic:** add newrelic support ([686bec7](https://github.com/Gapminder/waffle-server/commit/686bec7))
* **pack-middleware:** update unittests for ddfJson, csv, unknown format and occuring error during packing ([06500e8](https://github.com/Gapminder/waffle-server/commit/06500e8))
* **pack-processor:** support empty parameter select in entities and concepts queries ([8238cd2](https://github.com/Gapminder/waffle-server/commit/8238cd2))
* **query-normalizer:** add support of empty where clause ([7a25940](https://github.com/Gapminder/waffle-server/commit/7a25940))
* **Repos-route:** create route for repositories ([6c5ab9f](https://github.com/Gapminder/waffle-server/commit/6c5ab9f))
* **schema ddfql:** add support of ddfql schema queries ([fda4627](https://github.com/Gapminder/waffle-server/commit/fda4627))
* **shelljs-runners:** rewrite runners from bash to shelljs ([6680da3](https://github.com/Gapminder/waffle-server/commit/6680da3)), closes [#184](https://github.com/Gapminder/waffle-server/issues/184)
* **state polling:** add state checking support on WS during DDF import and update ([2e911ed](https://github.com/Gapminder/waffle-server/commit/2e911ed))
* **stats:** add route stats to WS for serving data to demo ([f03aced](https://github.com/Gapminder/waffle-server/commit/f03aced))
* **stats:** add stats route to WS ([c214a1c](https://github.com/Gapminder/waffle-server/commit/c214a1c))
* **stats:** add stats route to WS ([f15efe4](https://github.com/Gapminder/waffle-server/commit/f15efe4))
* **stats-route:** update ordering result for stats route ([ccaf352](https://github.com/Gapminder/waffle-server/commit/ccaf352))
* **stats-service:** update stats service for resolving different ranges of time ([c093450](https://github.com/Gapminder/waffle-server/commit/c093450))
* **time:** change internal time format ([dc4a1a7](https://github.com/Gapminder/waffle-server/commit/dc4a1a7))
* **time:** change internal time format ([a4e7d53](https://github.com/Gapminder/waffle-server/commit/a4e7d53))
* **time:** store format agnostic time representation (millis) for entities of domain "time" ([e88e6fd](https://github.com/Gapminder/waffle-server/commit/e88e6fd))
* **time:** store format agnostic time representation (millis) for entities of domain "time" ([b1024e3](https://github.com/Gapminder/waffle-server/commit/b1024e3))
* **transactions:** update cli service for working with transactions properly ([901a3c3](https://github.com/Gapminder/waffle-server/commit/901a3c3))
* **translations:**  add translations services ([3d3db67](https://github.com/Gapminder/waffle-server/commit/3d3db67))
* **translations:**  add yandex translation scrapper ([d0fe5d0](https://github.com/Gapminder/waffle-server/commit/d0fe5d0))
* **translations:**  count translation for state ([eae3a9e](https://github.com/Gapminder/waffle-server/commit/eae3a9e))
* **translations:**  implement findByLanguage method in translations.repository ([691e5ee](https://github.com/Gapminder/waffle-server/commit/691e5ee))
* **translations:**  improve loadLanguage implementation - use object literal instead of Map ([935d9b7](https://github.com/Gapminder/waffle-server/commit/935d9b7))
* **translations:**  return translations as an object where props are words and values are translations ([184c1d1](https://github.com/Gapminder/waffle-server/commit/184c1d1))
* **translations:**  translate strings based on ddfql language property ([8be9e45](https://github.com/Gapminder/waffle-server/commit/8be9e45))
* **translations:**  use scrapper instead of free google API for acquiring translations ([375b511](https://github.com/Gapminder/waffle-server/commit/375b511))
* **translations:** add ability to start translation process via REST API ([0bd8a18](https://github.com/Gapminder/waffle-server/commit/0bd8a18))
* **translations:** add translations to import process ([bcbc367](https://github.com/Gapminder/waffle-server/commit/bcbc367))
* **translations:** add translations to incremental update process ([887691d](https://github.com/Gapminder/waffle-server/commit/887691d))
* **translations:** update translations service for working with chunks ([1b8e68c](https://github.com/Gapminder/waffle-server/commit/1b8e68c))
* **unpack-processor:** add an endpoint for serving ddf data in unpacked format ([788a573](https://github.com/Gapminder/waffle-server/commit/788a573))



<a name="0.3.0"></a>
# [0.3.0](https://github.com/valor-software/waffle-server/compare/v0.2.1...v0.3.0) (2016-03-28)


### Bug Fixes

* **config-env:** add config for default inner port in server.js process ([0419fda](https://github.com/valor-software/waffle-server/commit/0419fda))
* **config-env:** update config for default ports for each environment local|dev|stage|prod ([3b941f9](https://github.com/valor-software/waffle-server/commit/3b941f9))
* **geo-time:** fix empty response for geo time route ([1e052bb](https://github.com/valor-software/waffle-server/commit/1e052bb)), closes [#135](https://github.com/valor-software/waffle-server/issues/135)
* **import ddf:** remove custom import path ([19f9ce5](https://github.com/valor-software/waffle-server/commit/19f9ce5))
* **integ-test:** fix integration tests after updating geo controller ([fe45072](https://github.com/valor-software/waffle-server/commit/fe45072))
* **metadata and translations:** add missing entries and remove redundant ones ([f4ded0e](https://github.com/valor-software/waffle-server/commit/f4ded0e))
* **translations:** update en.json ([f03eb65](https://github.com/valor-software/waffle-server/commit/f03eb65))
* **translations:** update translation strings ([f9ced19](https://github.com/valor-software/waffle-server/commit/f9ced19))

### Features

* **doc:** create  documentation on swagger ([dadff7a](https://github.com/valor-software/waffle-server/commit/dadff7a))
* **geo-cat:** implement new syntax for category of geo prop in request to WS (.is--, camelCase ([a35f1e4](https://github.com/valor-software/waffle-server/commit/a35f1e4)), closes [#138](https://github.com/valor-software/waffle-server/issues/138)
* **geo-props:** add mapping for new entities sets ([924f551](https://github.com/valor-software/waffle-server/commit/924f551))
* **import-ddf:** add integration tests for ddf file importer ([4c92d20](https://github.com/valor-software/waffle-server/commit/4c92d20))
* **import-export:** implement import data to mongodb and export data from mongodb to neo4j for new d ([ea617fa](https://github.com/valor-software/waffle-server/commit/ea617fa))
* **mocha-e2e:** update integration tests calling in gulp ([a434628](https://github.com/valor-software/waffle-server/commit/a434628)), closes [#140](https://github.com/valor-software/waffle-server/issues/140)
* **routes:** migrate routes and Data to WS ([793e25a](https://github.com/valor-software/waffle-server/commit/793e25a))
* **stats-route:** update stats route for getting data from neo4j with specified geos (global, regi ([19e7e5b](https://github.com/valor-software/waffle-server/commit/19e7e5b)), closes [#117](https://github.com/valor-software/waffle-server/issues/117)



<a name="0.2.1"></a>
## 0.2.1 (2016-02-03)


### Fix

* Fix: do not mutate query object during "mongo geo query". Real source of ref: #108 ([f62f442](https://github.com/valor-software/waffle-server/commit/f62f442))
* Fix: exclude node_modules from test path ([d7b17dd](https://github.com/valor-software/waffle-server/commit/d7b17dd))
* Fix: fixed mapping between properties in WaffleReader's query and WS ([555052a](https://github.com/valor-software/waffle-server/commit/555052a))
* Fix: update mongoose version to 4.3.7 it is supposed to fix ref: #108 ([7b03cae](https://github.com/valor-software/waffle-server/commit/7b03cae)), closes [#108](https://github.com/valor-software/waffle-server/issues/108)

### New

* New: clear IndexDB collection for each import [refs #123] ([684395b](https://github.com/valor-software/waffle-server/commit/684395b))

### Update

* Update: add new keys to translations files, change existing ones ([f69c315](https://github.com/valor-software/waffle-server/commit/f69c315))
* Update: remove redundant keys in metadata ([22dc48a](https://github.com/valor-software/waffle-server/commit/22dc48a))
* Update: remove redundant translations ([91d637c](https://github.com/valor-software/waffle-server/commit/91d637c))

* Merge pull request #107 from valor-software/update-translations ([737f71f](https://github.com/valor-software/waffle-server/commit/737f71f))
* Merge pull request #110 from valor-software/update-translations-remove-redundant-keys ([b1f9d18](https://github.com/valor-software/waffle-server/commit/b1f9d18))
* Merge pull request #111 from valor-software/update-remove-redundant-keys-from-metadata ([d6ad80f](https://github.com/valor-software/waffle-server/commit/d6ad80f))
* Merge pull request #112 from valor-software/update-mongoose-version ([6f225f7](https://github.com/valor-software/waffle-server/commit/6f225f7)), closes [#108](https://github.com/valor-software/waffle-server/issues/108)
* Merge pull request #113 from valor-software/fix-same-responce-agnostic-to-geo-param ([3f33704](https://github.com/valor-software/waffle-server/commit/3f33704))
* Merge pull request #129 from valor-software/feature-clear-indexdb-during-import-data ([263811f](https://github.com/valor-software/waffle-server/commit/263811f))
* Merge pull request #132 from valor-software/development ([cbe5a2d](https://github.com/valor-software/waffle-server/commit/cbe5a2d))



<a name="0.2.0"></a>
# 0.2.0 (2016-01-26)


### chore

* chore(data): removed outdated data and updated vizabi meta ([08c2120](https://github.com/valor-software/waffle-server/commit/08c2120))
* chore(ddf-import): added import from ddf folder ([3d36b26](https://github.com/valor-software/waffle-server/commit/3d36b26))
* chore(export): export to neo4j updated ([85e0034](https://github.com/valor-software/waffle-server/commit/85e0034))
* chore(graphs): include edge values in request ([88d64de](https://github.com/valor-software/waffle-server/commit/88d64de))
* chore(import-ddf): geo model updated, and empty measure values are not saved now ([685c59b](https://github.com/valor-software/waffle-server/commit/685c59b))
* chore(lint): some linting fixes ([b5af527](https://github.com/valor-software/waffle-server/commit/b5af527))
* chore(vizabi-meta): updated for new ddf names ([e13dab5](https://github.com/valor-software/waffle-server/commit/e13dab5))
* chore(vizabi): updated meta and translationsns ([30fa33d](https://github.com/valor-software/waffle-server/commit/30fa33d))

### Feature

* Feature: add query coder to stats route ([22ba087](https://github.com/valor-software/waffle-server/commit/22ba087))
* Feature: add sorting for stats endpoint ([7888b50](https://github.com/valor-software/waffle-server/commit/7888b50))
* Feature: add toPrecision and format data post processors ([0b60846](https://github.com/valor-software/waffle-server/commit/0b60846))
* Feature: add vizabi csv files generator ([8057ea9](https://github.com/valor-software/waffle-server/commit/8057ea9))

### fix

* fix: do not duplicate mongoose dependencie ([9a66696](https://github.com/valor-software/waffle-server/commit/9a66696))
* fix: move adapter out of api folder ([b9ed78a](https://github.com/valor-software/waffle-server/commit/b9ed78a))
* fix: wrong path to required files ([a31bcee](https://github.com/valor-software/waffle-server/commit/a31bcee))
* fix(adapter): set entities in metadata.json response ([ec4ad34](https://github.com/valor-software/waffle-server/commit/ec4ad34))
* fix(ddf-importer): updated to use latest data format ([87b6962](https://github.com/valor-software/waffle-server/commit/87b6962))
* fix(geo-api): lat long renamed in maping ([3bc4a7f](https://github.com/valor-software/waffle-server/commit/3bc4a7f))
* fix(geo): give region in response ([113f1e0](https://github.com/valor-software/waffle-server/commit/113f1e0))
* fix(vizabi): added child_mortality_rate_per1000 to meta and translations ([69611f9](https://github.com/valor-software/waffle-server/commit/69611f9))
* fix(vizabi): lat lng properties renamed to latitude longitude ([6d9e682](https://github.com/valor-software/waffle-server/commit/6d9e682))

### Fix

* Fix: filter null data in geo props and indicators data ([a5a7ab2](https://github.com/valor-software/waffle-server/commit/a5a7ab2))
* Fix: fix merge conflict in stats.json - version from development branch was applied ([954787a](https://github.com/valor-software/waffle-server/commit/954787a))
* Fix: fixed bubble chart and map char (+caching) ([fbc50da](https://github.com/valor-software/waffle-server/commit/fbc50da))
* Fix: fixed bugs with 'not corresponded' data for measures [refs #69] ([f0286b0](https://github.com/valor-software/waffle-server/commit/f0286b0)), closes [#69](https://github.com/valor-software/waffle-server/issues/69)
* Fix: fixed minor bugs ([9075a1c](https://github.com/valor-software/waffle-server/commit/9075a1c))
* Fix: fixed repeated function in geo props route [refs #69] ([fc5e6c0](https://github.com/valor-software/waffle-server/commit/fc5e6c0)), closes [#69](https://github.com/valor-software/waffle-server/issues/69)
* Fix: fixed route for getting stats (lat and lng) ([bcdd3ff](https://github.com/valor-software/waffle-server/commit/bcdd3ff))
* Fix: geo-time filtering by geo.cat, geo.region, time [refs #83] ([e848dbe](https://github.com/valor-software/waffle-server/commit/e848dbe))
* Fix: lower case geo ids ([a7eecfe](https://github.com/valor-software/waffle-server/commit/a7eecfe))
* Fix: lower case geo ids ([6757332](https://github.com/valor-software/waffle-server/commit/6757332))
* Fix: remove hardcode from stats [refs #69] ([0087426](https://github.com/valor-software/waffle-server/commit/0087426))
* Fix: revert geo data to stats route ([d8bc845](https://github.com/valor-software/waffle-server/commit/d8bc845))

### fixed

* fixed(geo): country to regions mappings ([e964260](https://github.com/valor-software/waffle-server/commit/e964260))

* Bumped version number to 0.2.0 ([a024743](https://github.com/valor-software/waffle-server/commit/a024743))
* fix cors for metadata & translation ([ab352e9](https://github.com/valor-software/waffle-server/commit/ab352e9))
* Merge pull request #100 from valor-software/update-add-tests-for-post-processors ([ddfba75](https://github.com/valor-software/waffle-server/commit/ddfba75))
* Merge pull request #101 from valor-software/feature-add-sorting-for-vizabi-stats ([4c8e192](https://github.com/valor-software/waffle-server/commit/4c8e192))
* Merge pull request #102 from valor-software/fix-cors ([f00ad58](https://github.com/valor-software/waffle-server/commit/f00ad58))
* Merge pull request #104 from valor-software/update-translations ([0c3660c](https://github.com/valor-software/waffle-server/commit/0c3660c))
* Merge pull request #105 from valor-software/release-0.2.0 ([5f26ddd](https://github.com/valor-software/waffle-server/commit/5f26ddd))
* Merge pull request #30 from valor-software/development ([7bbe979](https://github.com/valor-software/waffle-server/commit/7bbe979))
* Merge pull request #60 from valor-software/feature-ws-vizabi-doc ([fe9402f](https://github.com/valor-software/waffle-server/commit/fe9402f))
* Merge pull request #87 from valor-software/feature-adapter-service ([32d4c08](https://github.com/valor-software/waffle-server/commit/32d4c08))
* Merge pull request #97 from valor-software/update-csv-generator ([669cf74](https://github.com/valor-software/waffle-server/commit/669cf74))
* Merge pull request #98 from valor-software/cleanup ([e2070b5](https://github.com/valor-software/waffle-server/commit/e2070b5))
* Merge pull request #99 from valor-software/update-to-latest-ddf-data-format ([70c4b03](https://github.com/valor-software/waffle-server/commit/70c4b03))
* removed all unused files ([f81c9c7](https://github.com/valor-software/waffle-server/commit/f81c9c7))
* transaltions udpate to latest vizabi ([5238175](https://github.com/valor-software/waffle-server/commit/5238175))
* update vizabi metadata ([f87b0d8](https://github.com/valor-software/waffle-server/commit/f87b0d8))

### new

* new: added geo model ([ea141a1](https://github.com/valor-software/waffle-server/commit/ea141a1))
* new: added vizabi-gini measure ([77d96ea](https://github.com/valor-software/waffle-server/commit/77d96ea))

### New

* New: added Adapter Service to Waffle Server ([bf02252](https://github.com/valor-software/waffle-server/commit/bf02252))
* New: added geo props projection [refs #72] ([3074df0](https://github.com/valor-software/waffle-server/commit/3074df0))
* New: added new route for geo properties [ref #51] ([d2fa6be](https://github.com/valor-software/waffle-server/commit/d2fa6be))
* New: added new route for geo properties [ref #51] ([a484de9](https://github.com/valor-software/waffle-server/commit/a484de9))
* New: added translations ([c843d5a](https://github.com/valor-software/waffle-server/commit/c843d5a))
* New: created complete documentation for stats API [refs #81] ([9fd605d](https://github.com/valor-software/waffle-server/commit/9fd605d))
* New: created new gapfilling post processor [refs #78] ([d5d5d91](https://github.com/valor-software/waffle-server/commit/d5d5d91))
* New: geo data imported from CSV ([15a0d87](https://github.com/valor-software/waffle-server/commit/15a0d87))

### update

* update: added create indicators ([85fd2ce](https://github.com/valor-software/waffle-server/commit/85fd2ce))
* update: added indicator values import ([7e75a90](https://github.com/valor-software/waffle-server/commit/7e75a90))
* update: clean indicators and measures csv updata ([6be4659](https://github.com/valor-software/waffle-server/commit/6be4659))
* update: export mongoose models ([4f05fe3](https://github.com/valor-software/waffle-server/commit/4f05fe3))
* update: lazy es6 arraw callbacks ([51a144f](https://github.com/valor-software/waffle-server/commit/51a144f))
* update: schema of dimensions ([7c3c641](https://github.com/valor-software/waffle-server/commit/7c3c641))

### Update

* Update: add geos and measure values validators with vizabi data files ([2ba4afb](https://github.com/valor-software/waffle-server/commit/2ba4afb))
* Update: add tests for toPrecision, format, gapfilling post processors and query coder ([db46f8d](https://github.com/valor-software/waffle-server/commit/db46f8d))
* Update: add translations to se.json ([79bd140](https://github.com/valor-software/waffle-server/commit/79bd140))
* Update: create dimensions year and country ([42c0ebb](https://github.com/valor-software/waffle-server/commit/42c0ebb))
* Update: csv generator is actualized, fix geo-properties controller response format ([b28932b](https://github.com/valor-software/waffle-server/commit/b28932b))
* Update: refactor validation logic, improve processing speed ([4a83b48](https://github.com/valor-software/waffle-server/commit/4a83b48))
* Update: use positive projection in queries, use _.compact instead of _.filter to ged rid of undefine ([b9c13fd](https://github.com/valor-software/waffle-server/commit/b9c13fd))

### Updated

* Updated: add custom Vizabi for Vizabi Tools #59 ([555341f](https://github.com/valor-software/waffle-server/commit/555341f))
* Updated: doc&script for WS to Vizabi integration ([8aff615](https://github.com/valor-software/waffle-server/commit/8aff615))
* Updated: updated generator for filtering emty values ([acf7999](https://github.com/valor-software/waffle-server/commit/acf7999))



<a name="0.1.0"></a>
# 0.1.0 (2015-10-09)


### chore

* chore(clean): project clean up ([b283e5a](https://github.com/valor-software/waffle-server/commit/b283e5a))
* chore(export): export unique dimensions with values ([e4388c4](https://github.com/valor-software/waffle-server/commit/e4388c4))
* chore(neo4j): cleanup + export ([bd17c8e](https://github.com/valor-software/waffle-server/commit/bd17c8e))
* chore(oauth): host_url ([4a9d42e](https://github.com/valor-software/waffle-server/commit/4a9d42e))
* chore(oauth): host_url ([dacdc68](https://github.com/valor-software/waffle-server/commit/dacdc68))
* chore(pipe): base of recognize dimensions ([47ab390](https://github.com/valor-software/waffle-server/commit/47ab390))
* chore(pipe): recognize dimensions pretify ([4f23036](https://github.com/valor-software/waffle-server/commit/4f23036))
* chore(pipes): a bit of styling ([be6a445](https://github.com/valor-software/waffle-server/commit/be6a445))
* chore(pipes): indicator export form and preview ([85a7ae8](https://github.com/valor-software/waffle-server/commit/85a7ae8))
* chore(pipes): indicator export works ([2143ed3](https://github.com/valor-software/waffle-server/commit/2143ed3))
* chore(pipes): indicators crud ([bfbc510](https://github.com/valor-software/waffle-server/commit/bfbc510))
* chore(pipes): recognize dimensions ([8a135df](https://github.com/valor-software/waffle-server/commit/8a135df))
* chore(pipes): removed test data ([c1ae350](https://github.com/valor-software/waffle-server/commit/c1ae350))
* chore(pipes): set dim title correctly ([abcb807](https://github.com/valor-software/waffle-server/commit/abcb807))
* chore(pipes): simplify steps logic ([d990af7](https://github.com/valor-software/waffle-server/commit/d990af7))
* chore(pipes): unique dim values on extractionon ([ece8930](https://github.com/valor-software/waffle-server/commit/ece8930))
* chore(pipes): unique dimension values only ([740249b](https://github.com/valor-software/waffle-server/commit/740249b))
* chore(pipes): update TableQuery ([a07623b](https://github.com/valor-software/waffle-server/commit/a07623b))
* chore(pipes): use freeze columns ([a69e512](https://github.com/valor-software/waffle-server/commit/a69e512))
* chore(readme): global requirments ([2f84b1e](https://github.com/valor-software/waffle-server/commit/2f84b1e))
* chore(regions): added missed ISO3 to region data ([33501b8](https://github.com/valor-software/waffle-server/commit/33501b8))
* chore(stats): ready for vizabi-tools ([6a40277](https://github.com/valor-software/waffle-server/commit/6a40277))
* chore(stats): ws stats api ready ([81abe24](https://github.com/valor-software/waffle-server/commit/81abe24))

### feat

* feat(pipe): import preview ([b5f63fe](https://github.com/valor-software/waffle-server/commit/b5f63fe))
* feat(pipes): added context menu ([0b636f8](https://github.com/valor-software/waffle-server/commit/0b636f8))
* feat(pipes): idempotent dimension and values creation & export ([3b34c9c](https://github.com/valor-software/waffle-server/commit/3b34c9c))
* feat(piping): preview updated ([4a872f5](https://github.com/valor-software/waffle-server/commit/4a872f5))

### fix

* fix(pipes): do not overwrite empty titles ([e2e16ec](https://github.com/valor-software/waffle-server/commit/e2e16ec))

### Fix

* Fix: added font-awesome for icons ([fd232e3](https://github.com/valor-software/waffle-server/commit/fd232e3))
* Fix: added missing dependencies for node.js server ([3007d69](https://github.com/valor-software/waffle-server/commit/3007d69))
* Fix: after rebase fix commit ([1ef04a5](https://github.com/valor-software/waffle-server/commit/1ef04a5))
* Fix: charts splited in tabs ([736425e](https://github.com/valor-software/waffle-server/commit/736425e))
* Fix: fixed error with empty filter for file records [refs #17] ([869a4ad](https://github.com/valor-software/waffle-server/commit/869a4ad)), closes [#17](https://github.com/valor-software/waffle-server/issues/17)
* Fix: fixed express routing [refs #5] ([88275e6](https://github.com/valor-software/waffle-server/commit/88275e6)), closes [#5](https://github.com/valor-software/waffle-server/issues/5)
* Fix: fixed importing and analysing data to db [refs #17] ([7890ea5](https://github.com/valor-software/waffle-server/commit/7890ea5)), closes [#17](https://github.com/valor-software/waffle-server/issues/17)
* Fix: fixed landing page view [refs #5] ([c738a9a](https://github.com/valor-software/waffle-server/commit/c738a9a)), closes [#5](https://github.com/valor-software/waffle-server/issues/5)
* Fix: fixed layout of homepage [refs #5] ([dd18cc2](https://github.com/valor-software/waffle-server/commit/dd18cc2)), closes [#5](https://github.com/valor-software/waffle-server/issues/5)
* Fix: fixed looping of loading index.html inside origin index.html ([9ca75a3](https://github.com/valor-software/waffle-server/commit/9ca75a3))
* Fix: fixed script for import data to neo4j ([cefa209](https://github.com/valor-software/waffle-server/commit/cefa209))
* Fix: fixed spreadsheet view for import data [refs #11] ([a8ddd92](https://github.com/valor-software/waffle-server/commit/a8ddd92)), closes [#11](https://github.com/valor-software/waffle-server/issues/11)
* Fix: fixed storing indicator value [refs #17] ([ad5efd5](https://github.com/valor-software/waffle-server/commit/ad5efd5)), closes [#17](https://github.com/valor-software/waffle-server/issues/17)
* Fix: moved application object to Service Locator and fixed setuping default options for utility json ([84df5ba](https://github.com/valor-software/waffle-server/commit/84df5ba)), closes [#14](https://github.com/valor-software/waffle-server/issues/14)
* Fix: moved converting handler to the separate service [fix #14] ([d6945a8](https://github.com/valor-software/waffle-server/commit/d6945a8)), closes [#14](https://github.com/valor-software/waffle-server/issues/14)
* Fix: remove state from rootScope, use ui-sref-active [refs #5] ([73a1a09](https://github.com/valor-software/waffle-server/commit/73a1a09))
* Fix: remove unnecessary bower modules [refs #5] ([002205c](https://github.com/valor-software/waffle-server/commit/002205c))
* Fix: remove unnecessary index.html and update bower modules [refs #5] ([b5b8b6b](https://github.com/valor-software/waffle-server/commit/b5b8b6b))
* Fix: remove unnecessary libs from bower and index.html [refs #5] ([7c0fcfb](https://github.com/valor-software/waffle-server/commit/7c0fcfb))
* Fix: removed comments for import all data type (csv, spreadsheets) [refs #17] ([c9723e7](https://github.com/valor-software/waffle-server/commit/c9723e7))
* Fix: rename module from adminPanel to admin [refs #5] ([a1e905a](https://github.com/valor-software/waffle-server/commit/a1e905a))
* Fix: update import module for importing data to neo4j [refs #17] ([32ca566](https://github.com/valor-software/waffle-server/commit/32ca566))

### Fixed

* Fixed: stub csv route ([959df60](https://github.com/valor-software/waffle-server/commit/959df60))

### New

* New: added angular-ui and oczlazyload ([ea9b713](https://github.com/valor-software/waffle-server/commit/ea9b713))
* New: added bootstrap of eslint, gulp, .gitignore, readme and implementation overview ([31ee3e7](https://github.com/valor-software/waffle-server/commit/31ee3e7))
* New: added browser\node independed service locator ([a517527](https://github.com/valor-software/waffle-server/commit/a517527))
* New: added check for unsupported file formats ([ad567b1](https://github.com/valor-software/waffle-server/commit/ad567b1))
* New: added connection to mongoose ([8b5d423](https://github.com/valor-software/waffle-server/commit/8b5d423))
* New: added data files [refs #17] ([a84b800](https://github.com/valor-software/waffle-server/commit/a84b800))
* New: added editor config settings ([0ca94cb](https://github.com/valor-software/waffle-server/commit/0ca94cb))
* New: added final handler after processing csv file [refs #17] ([0991fcb](https://github.com/valor-software/waffle-server/commit/0991fcb))
* New: added google spread sheets imported ([eeb9ce4](https://github.com/valor-software/waffle-server/commit/eeb9ce4))
* New: added implementaion overview ([1f30021](https://github.com/valor-software/waffle-server/commit/1f30021))
* New: added mongodb schemas and repositories ([2727670](https://github.com/valor-software/waffle-server/commit/2727670))
* New: added new node module line-input-stream [refs #17] ([1c8ba88](https://github.com/valor-software/waffle-server/commit/1c8ba88))
* New: added ng-stats display to track amount of watchers ([393895b](https://github.com/valor-software/waffle-server/commit/393895b))
* New: added node modules csv-parse, csv-stream, stream-transform and removed line-input-stream [refs  ([5758936](https://github.com/valor-software/waffle-server/commit/5758936))
* New: added script generating list of DS to import ([a2b7238](https://github.com/valor-software/waffle-server/commit/a2b7238))
* New: added select2 lib ([1083784](https://github.com/valor-software/waffle-server/commit/1083784))
* New: added select2 libs ([98acdbc](https://github.com/valor-software/waffle-server/commit/98acdbc))
* New: added testing flow ([beb9ce1](https://github.com/valor-software/waffle-server/commit/beb9ce1))
* New: all schemas updated ([2d9ae6e](https://github.com/valor-software/waffle-server/commit/2d9ae6e))
* New: create csv files from json [refs #17] ([55608b1](https://github.com/valor-software/waffle-server/commit/55608b1))
* New: create files for import csv plugin [refs #17] ([d79eab1](https://github.com/valor-software/waffle-server/commit/d79eab1))
* New: create module for controllers [refs #5] ([e50c740](https://github.com/valor-software/waffle-server/commit/e50c740))
* New: create new analyser for colors spreadsheets ([812091e](https://github.com/valor-software/waffle-server/commit/812091e))
* New: create new templates for imported data spreadsheet [refs #11] ([6e2cc12](https://github.com/valor-software/waffle-server/commit/6e2cc12))
* New: create preform layout of cyper editor [refs #10] ([bbf452e](https://github.com/valor-software/waffle-server/commit/bbf452e))
* New: create route for converting data from json to csv format [refs #14] ([f55fdf7](https://github.com/valor-software/waffle-server/commit/f55fdf7))
* New: create tables and breadcrumbs for collections [refs #5] ([dccd7de](https://github.com/valor-software/waffle-server/commit/dccd7de))
* New: create templates and routes for collections [refs #5] ([eb39512](https://github.com/valor-software/waffle-server/commit/eb39512))
* New: created cyper playground template (frontend) [refs #10] ([a973315](https://github.com/valor-software/waffle-server/commit/a973315))
* New: created deploy instruction ([4388eec](https://github.com/valor-software/waffle-server/commit/4388eec))
* New: created route for getting imported data [refs #11] ([251d3f1](https://github.com/valor-software/waffle-server/commit/251d3f1))
* New: devinfo.org import util ([c8d29af](https://github.com/valor-software/waffle-server/commit/c8d29af))
* New: gulpfile bootstraped ([ebb838d](https://github.com/valor-software/waffle-server/commit/ebb838d))
* New: Humnum martix import ([0421e88](https://github.com/valor-software/waffle-server/commit/0421e88))
* New: implemented analysing dimensions and dimension values [refs #17] ([5bba918](https://github.com/valor-software/waffle-server/commit/5bba918))
* New: implemented running queries to neo4j (backend) [refs #5] ([66e272b](https://github.com/valor-software/waffle-server/commit/66e272b))
* New: include csv parser module and csv transformer module to csv importer [refs #17] ([c36572e](https://github.com/valor-software/waffle-server/commit/c36572e))
* New: include import csv plugin files to app.js [refs #17] ([15a6b02](https://github.com/valor-software/waffle-server/commit/15a6b02))
* New: libs bootstrped ([3e182d5](https://github.com/valor-software/waffle-server/commit/3e182d5))
* New: PoC export to neo4j ([5162dd7](https://github.com/valor-software/waffle-server/commit/5162dd7))
* New: Publishers menu, routes, table, stub for editing form ([b4f1fd7](https://github.com/valor-software/waffle-server/commit/b4f1fd7))
* New: routes bootstrped ([b2d6fdd](https://github.com/valor-software/waffle-server/commit/b2d6fdd))
* New: sample app importing a list of data sources ([7b44c9f](https://github.com/valor-software/waffle-server/commit/7b44c9f))
* New: samples of working with ds, could be brokean or outdated, do not use ([333705c](https://github.com/valor-software/waffle-server/commit/333705c))
* New: ui components bootstrap ([5fe25b3](https://github.com/valor-software/waffle-server/commit/5fe25b3))
* New: update data source file for import data [refs #17] ([822cc12](https://github.com/valor-software/waffle-server/commit/822cc12))
* New: updated analysing functions for dimension values, indicator, indicator values [refs #17] ([a933050](https://github.com/valor-software/waffle-server/commit/a933050))
* New: vreated test data for analysing csv files [refs #17] ([efd1c3d](https://github.com/valor-software/waffle-server/commit/efd1c3d))

### Update

* Update: add npm commands: deb, serve, start ([92af52b](https://github.com/valor-software/waffle-server/commit/92af52b))
* Update: added  to import data spreadsheet ([dfb3c0f](https://github.com/valor-software/waffle-server/commit/dfb3c0f))
* Update: added dependecy on font-awesome and removed dep on cdn:ui-grid ([f6ef6af](https://github.com/valor-software/waffle-server/commit/f6ef6af))
* Update: cypher api endpoint with redis and caching ([c2af516](https://github.com/valor-software/waffle-server/commit/c2af516))
* Update: cypher query playground default request updated ([9ab71ca](https://github.com/valor-software/waffle-server/commit/9ab71ca))
* Update: data prefetch - disabled, watchers count - reduced, paging - updated, unnecessary data - hid ([1850fe8](https://github.com/valor-software/waffle-server/commit/1850fe8))
* Update: download files from S3 with real name ([6741de4](https://github.com/valor-software/waffle-server/commit/6741de4))
* Update: file service logic extracted ([ad7d1af](https://github.com/valor-software/waffle-server/commit/ad7d1af))
* Update: fix collections list page api endpoint ([a25e497](https://github.com/valor-software/waffle-server/commit/a25e497))
* Update: removed deprecated, rewritten to use webpack ([70ae930](https://github.com/valor-software/waffle-server/commit/70ae930))

### Updated

* Updated: add losted ([83e182a](https://github.com/valor-software/waffle-server/commit/83e182a))
* Updated: bootstrap for Publisher Details ([35d4db0](https://github.com/valor-software/waffle-server/commit/35d4db0))
* Updated: breadcrumbs states was fixed ([b654609](https://github.com/valor-software/waffle-server/commit/b654609))
* Updated: caching for Stats ([df25fc9](https://github.com/valor-software/waffle-server/commit/df25fc9))
* Updated: counter of versions for Publisher ([1e7087c](https://github.com/valor-software/waffle-server/commit/1e7087c))
* Updated: CRUD for Publishers ([9d5e66b](https://github.com/valor-software/waffle-server/commit/9d5e66b))
* Updated: CRUD for Publishers-2 ([520f10b](https://github.com/valor-software/waffle-server/commit/520f10b))
* Updated: factories refactoring; publisher versions-details UI; add backend template for pagedList ge ([88dd103](https://github.com/valor-software/waffle-server/commit/88dd103))
* Updated: fixes for UI -> Dimension Values ([5a66981](https://github.com/valor-software/waffle-server/commit/5a66981))
* Updated: import devinfo.org to db 2 ([79edb56](https://github.com/valor-software/waffle-server/commit/79edb56))
* Updated: Import Session: add relation to Publicher Catalog Version ([f3af229](https://github.com/valor-software/waffle-server/commit/f3af229))
* Updated: prettify files structure ([ba34bb7](https://github.com/valor-software/waffle-server/commit/ba34bb7))
* Updated: Publisher Catalog Version Details UI ([64d948c](https://github.com/valor-software/waffle-server/commit/64d948c))
* Updated: Publisher Catalog Version Details UI#2 ([0f5fbbb](https://github.com/valor-software/waffle-server/commit/0f5fbbb))
* Updated: PublishersCollectionController prettify ([a8ab867](https://github.com/valor-software/waffle-server/commit/a8ab867))
* Updated: readme ([90d192d](https://github.com/valor-software/waffle-server/commit/90d192d))
* Updated: redis cache for some routes ([e2e04ec](https://github.com/valor-software/waffle-server/commit/e2e04ec))
* Updated: route changing during ~select component of version~ was changed ([30ed335](https://github.com/valor-software/waffle-server/commit/30ed335))
* Updated: small fix for Datails count ([effe898](https://github.com/valor-software/waffle-server/commit/effe898))
* Updated: some fixes + UI for Breadcrumbs ([8e17123](https://github.com/valor-software/waffle-server/commit/8e17123))
* Updated: some fixes + UI for Breadcrumbs#2 ([2f091ba](https://github.com/valor-software/waffle-server/commit/2f091ba)), closes [Breadcrumbs#2](https://github.com/Breadcrumbs/issues/2)
* Updated: todo was added ([6e61d2b](https://github.com/valor-software/waffle-server/commit/6e61d2b))
* Updated: UI for Catalog Versions ([750cd1e](https://github.com/valor-software/waffle-server/commit/750cd1e))
* Updated: UI for Dimensions->Dimension values ([a187455](https://github.com/valor-software/waffle-server/commit/a187455))
* Updated: UI for Indicators & Indicator Values ([eb32b40](https://github.com/valor-software/waffle-server/commit/eb32b40))
* Updated: UI for Indicators & Indicator Values #2 ([2cef53d](https://github.com/valor-software/waffle-server/commit/2cef53d))
* Updated: UI for Publisher Catalogs ([c2edbe9](https://github.com/valor-software/waffle-server/commit/c2edbe9))
* Updated: UI for stats ([16e4e22](https://github.com/valor-software/waffle-server/commit/16e4e22))
* Updated: UI stats: alpha ([ff6369e](https://github.com/valor-software/waffle-server/commit/ff6369e))

* added handsontable lib ([75177ce](https://github.com/valor-software/waffle-server/commit/75177ce))
* added ngTables ([8a5b325](https://github.com/valor-software/waffle-server/commit/8a5b325))
* aws ([b59468d](https://github.com/valor-software/waffle-server/commit/b59468d))
* Basic piping ([d319ac9](https://github.com/valor-software/waffle-server/commit/d319ac9))
* Configuration tweaks ([a6190ba](https://github.com/valor-software/waffle-server/commit/a6190ba))
* Dimensions crud ([b515cec](https://github.com/valor-software/waffle-server/commit/b515cec))
* file upload ([4562d69](https://github.com/valor-software/waffle-server/commit/4562d69))
* files list with search ([e1c995b](https://github.com/valor-software/waffle-server/commit/e1c995b))
* Initial commit ([6a60860](https://github.com/valor-software/waffle-server/commit/6a60860))
* Loggin is required ([1ecbba3](https://github.com/valor-software/waffle-server/commit/1ecbba3))
* Merge pull request #12 from valor-software/features-cypher-playground ([23018b2](https://github.com/valor-software/waffle-server/commit/23018b2))
* Merge pull request #13 from valor-software/features-spreadsheet-view ([f8244ea](https://github.com/valor-software/waffle-server/commit/f8244ea))
* Merge pull request #15 from valor-software/features-utility-json-to-csv ([68405a4](https://github.com/valor-software/waffle-server/commit/68405a4))
* Merge pull request #18 from valor-software/features-create-import-csv-plugin ([b0e9822](https://github.com/valor-software/waffle-server/commit/b0e9822))
* Merge pull request #20 from valor-software/ui-publishers ([de8a6f5](https://github.com/valor-software/waffle-server/commit/de8a6f5))
* Merge pull request #22 from valor-software/humnum-import-3 ([6d7d2f6](https://github.com/valor-software/waffle-server/commit/6d7d2f6))
* Merge pull request #23 from valor-software/devinfo-org-import ([19279d9](https://github.com/valor-software/waffle-server/commit/19279d9))
* Merge pull request #24 from valor-software/feature-ui-publisher-schema-update ([a7eaab2](https://github.com/valor-software/waffle-server/commit/a7eaab2))
* Merge pull request #25 from valor-software/feature-file-processing ([83b7bc6](https://github.com/valor-software/waffle-server/commit/83b7bc6))
* Merge pull request #28 from valor-software/feature-data-piping ([b760102](https://github.com/valor-software/waffle-server/commit/b760102))
* Merge pull request #29 from valor-software/development ([8d4a8d4](https://github.com/valor-software/waffle-server/commit/8d4a8d4))
* Merge pull request #3 from valor-software/feature-ws-bootstrap ([0b904af](https://github.com/valor-software/waffle-server/commit/0b904af))
* Merge pull request #4 from valor-software/doc-create-and-deploy ([cb215f7](https://github.com/valor-software/waffle-server/commit/cb215f7))
* Merge pull request #7 from valor-software/feature-bootstrap-libs ([412960f](https://github.com/valor-software/waffle-server/commit/412960f))
* Merge pull request #8 from valor-software/features-ng-ui-routing-lib-added ([1abd237](https://github.com/valor-software/waffle-server/commit/1abd237))
* Merge pull request #9 from valor-software/features-bootstrap-ui-components ([1cf2a2d](https://github.com/valor-software/waffle-server/commit/1cf2a2d))
* pipe as a wizard? ([8e68b2f](https://github.com/valor-software/waffle-server/commit/8e68b2f))
* Preview any table format ([c9d5ccd](https://github.com/valor-software/waffle-server/commit/c9d5ccd))
* preview multisheet tables ([b86a1c0](https://github.com/valor-software/waffle-server/commit/b86a1c0))
* Reset error ([cf830a8](https://github.com/valor-software/waffle-server/commit/cf830a8))
* Server static files with html5 fallback ([dc55b75](https://github.com/valor-software/waffle-server/commit/dc55b75))
* Set col width to 100px ([765ee40](https://github.com/valor-software/waffle-server/commit/765ee40))
* xlxs ([c5dab46](https://github.com/valor-software/waffle-server/commit/c5dab46))
* xlxs from node modules ([cc122eb](https://github.com/valor-software/waffle-server/commit/cc122eb))



