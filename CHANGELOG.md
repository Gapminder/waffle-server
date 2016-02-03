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



