# Specification of query accepted by WS API

### 1) Convertion flow of query properties list
(query in data reader -> encoded query -> decoded query)

#### - Example of query which Data Reader (WSReader, DDFReader) gets from Vizabi

```
{
  select: ["geo", "time", "pop"],
  where: {
    "geo": ["africa", "chn"],
    "geo.region": ["africa", "europe", "asia"],
    "geo.cat": ["region", "country"],
    "time": [1800, [2000, 2010], 2015]
  },
  gapfilling: {interpolation: "lin", extrapolation: 3}
}
```

#### - Example of string encoded by QueryCoder:

```
?select=geo,time,pop&geo=africa,chn&geo.cat=region,country&geo.region=africa,europe,asia&time=1800,2000:2010,2015&gapfilling=interpolation:lin,extrapolation:3
```

#### - Example of decoded query (parsed from request on WS)

```
{
  select: ["geo", "time", "pop"],
  where: {
    "geo": ["africa", "chn"],
    "geo.region": ["africa", "europe", "asia"],
    "geo.cat": ["region", "country"],
    "time": [1800, [2000, 2010], 2015]
  },
  gapfilling: {interpolation: "lin", extrapolation: 3}
}
```

### 2) Description of parameters in decoded query (on WS):
##### * `select` - array of columns
(by default following columns are used: `['geo', 'geo.name', 'geo.cat', 'geo.region']`). Order of columns is important!

1) Examples (possible columns combinations)
* any measure (e.g. `fertility_rate`, `life_expectancy`, `population`)
* time
* geo, geo.name, geo.cat, geo.region, geo.lat, geo.lng

2) Evaluating of request type (examples: [geo-props](#--response-for-certain-select-geo-props), [geo-time](#--response-for-certain-select-geo-time), [geo-time-measure](#--response-for-certain-select-geo-time-measure)) is perfomed according to values in `select`:
- if there are no columns in request then `geo-props` will be returned ([example 1](#--response-for-default-request), [example 2](#--response-for-default-request-1))
- if there are no columns except `geo` and `time` in any order in request then `geo-time` will be returned ([example 1](#--response-for-certain-select-geo-time), [example 2](#--response-for-certain-select-geo-time-1))
- if request includes any geo property (`geo.name,geo.cat,geo.region,geo.lat,geo.lng`) except `geo`, and independently from other given in request columns (e.g., time, measures),`geo-props` will be returned ([example 1](#--response-for-certain-select), [example 2](#--response-for-certain-select-geo-props))
- if request includes geo, time, measure(s), `geo-time-measure` will be returned ([example](#--response-for-certain-select-geo-time-measure))

##### * `where`- list of filters for dimensions
(e.g., `{geo:['afr','chn']}`). All filters will be applied sequentially (the order doesn't matter):

1) `geo` - array of needed `gid`'s in result:

- if there is no value, filter will be skipped
- the array of values could be any existing `gid` in DB ([example 1](#--response-for-certain-select-and-filtered-by-geo-with-list-of-gids), [example 2](#--response-for-certain-select-and-filtered-by-geo-with-list-of-gids-geo-props))
- result will consist only from unique geo-props, filtered by `geo` values

2) `geo.region` - array of needed `region4` in result:

- if there is no value, filter will be skipped
- `geo.region` may contain some or all of the given values: `asia,americas,europe,africa`
- result will consist only from unique geo-props, filtered by `geo.region` values

3) `geo.cat` - array of territory categories:

- if there is no value, filter will be skipped
- `geo.cat` may contain some or all of the given values: `global,region,country,unstate,world_4region,geo` ([example 1](#--response-for-certain-select-and-filtered-by-geocat-with-list-of-categories-only-country-and-region), [example 2](#--response-for-certain-select-and-filtered-by-geocat-with-list-of-categories-geo-props))
- value `geo` means all geo-props will be returned
- result will consist only unique geo-props, filtered by `geo.cat` (read as `isGlobal,isRegion4,isCountry,isUnState`) values

4) `time` - array of time ranges that will be used to filter data (e.g., `[1955, [1960, 2000], 2010]`)

- if there is no value, filter will be skipped
- if there is only one year (e.g, `[1955]`), only data for a specific year will be returned ([example](#--response-for-certain-select-and-filter-time-geo-time-measure))
- if there is only one range (e.g, `[[1960, 2000]]`), only data for a specific range will be returned (range borders are inclusive, [example](#--response-for-certain-select-and-filter-time-geo-time-measure-1))
- if there are some years and ranges mixed (e.g., `[1955, [1960, 2000], 2010]`) in any order, then data will be filtered acoording to given ranges and values.

##### * `gapfilling` - list of methods for post processing of measures data (_isn't supported yet_):

 * If this option is used, then you can expect:
   - all missed years will be expanded (with null as a default value for each absent measure value)
   - interpolation and extrapolation could be used at the same time (or just only one of them)
   - the order of applying those gapfilling functions doesn't matter
 * `interpolation` - fill gaps within time ranges for each absent measure value
 * `extrapolation` - fill gaps for future and past time where there are no measure values

### 3) `/api/geo`
(for getting geo props ONLY)

#### - response for default request:
* request: `/api/geo`
* response:
```
{
  "headers": ["geo","geo.name","geo.cat","geo.region"],
  "rows": [
    ["abkh","Abkhazia","country","abkh"],
    ...
    ["world","World","global","world"]
  ]
}
```

#### - response for certain select:
* request: `/api/geo?select=geo.lat,geo.name,geo`
* response:
```
{
  "headers": ["geo.lat","geo.name","geo"],
  "rows": [
    [null,"Abkhazia","abkh"],
    [12.5,"Aruba","abw"],
    ...
  ]
}
```

### - response for certain select and filtered by `geo` with list of `gid`'s:
* request: `/api/geo?select=geo.lat,geo.name,geo&geo=chn`
* response:
```
{
  "headers": ["geo.lat","geo.name","geo"],
  "rows": [
    [35, "China", "chn"]
  ]
}
```

### - response for certain select and filtered by `geo.cat` with list of categories (only country and region):
* request: `/api/geo?select=geo.lat,geo.name,geo&geo.cat=country,region`
* response:
```
{
  "headers": ["geo.lat","geo.name","geo.cat","geo"],
  "rows": [
    [null,"Abkhazia","country","abkh"],
    [12.5,"Aruba","country","abw"],
    ...,
    [50.75,"Europe","region","europe"]
  ]
}
```

### 4) `/api/graphs/stats/vizabi-tools`
(for getting `geo-props`, `geo-time`, `geo-time-measure`)

#### - response for default request:
* request: `/api/graphs/stats/vizabi-tools`
* response:
```
{
  "headers": ["geo","geo.name","geo.cat","geo.region],
  "rows": [
    ["abkh","Abkhazia","country","abkh"],
    ...
    ["world","World","global","world"]
  ]
}
```

#### - response for certain select (`geo-props`):
* request: `/api/graphs/stats/vizabi-tools?select=geo.lat,geo.name,geo`
* response:
```
{
  "headers": ["geo.lat","geo.name","geo"],
  "rows": [
    [null,"Abkhazia","abkh"],
    [12.5,"Aruba","abw"],
    ...
  ]
}
```

### - response for certain select and filtered by `geo` with list of `gid`'s (`geo-props`):
* request: `/api/graphs/stats/vizabi-tools?select=geo.lat,geo.name,geo&geo=chn`
* response:
```
{
  "headers": ["geo.lat","geo.name","geo"],
  "rows": [
    [35, "China", "chn"]
  ]
}
```

### - response for certain select and filtered by `geo.cat` with list of categories (`geo-props`):
* request: `/api/graphs/stats/vizabi-tools?select=geo.lat,geo.name,geo&geo.cat=country,region`
* response:
```
{
  "headers": ["geo.lat","geo.name","geo.cat","geo"],
  "rows": [
    [null,"Abkhazia","country","abkh"],
    [12.5,"Aruba","country","abw"],
    ...,
    [50.75,"Europe","region","europe"]
  ]
}
```

### - response for certain select (`geo-time`):
* request:
  `/api/graphs/stats/vizabi-tools?select=geo,time`
* response:
```
{
  "headers":["geo","time"],
  "rows":[
    ["abkh","1800"],
    ["abkh","1801"],
    ...
  ]
}
```

### - response for certain select (`geo-time`):
* request:
  `/api/graphs/stats/vizabi-tools?select=time,geo`
* response:
```
{
  "headers":["time", "geo"],
  "rows":[
    ["1800", "abkh"],
    ["1801", "abkh"],
    ...
  ]
}
```

### - response for certain select (`geo-time-measure`):
* request:
  `/api/graphs/stats/vizabi-tools?select=geo,time,population,gini`
* response:
```
{
  "headers": ["geo","time","population","gini"],
  "rows":[
    ["stp",1984,101871,null],
    ["mus",1822,null,39.6],
    ...
  ]
}
```

### - response for certain select and filter by `geo` with list of `gid`'s (`geo-time-measure`):
* request:
  `/api/graphs/stats/vizabi-tools?select=geo,time,population,gini&geo=chn`
* response:
```
{
  "headers": ["geo","time","population","gini"],
  "rows":[
    ["chn",1907,null,36.7],
    ["chn",1872,null,35.5],
    ["chn",1958,625155626,35.6],
    ...
  ]
}
```

### - response for certain select and filter time (`geo-time-measure`):
* request:
  `/api/graphs/stats/vizabi-tools?select=geo,time,population,gini&time=1800`
* response:
```
{
  "headers": ["geo","time","population","gini"],
  "rows":[
    ["cmr",1800,1860054,56.2],
    ["prt",1800,3033454,55.1],
    ...
  ]
}
```

### - response for certain select and filter time (`geo-time-measure`):
* request:
  `/api/graphs/stats/vizabi-tools?select=geo,time,population,gini&time=2000:2010`
* response:
```
{
  "headers": ["geo","time","population","gini"],
  "rows":[
    ["wsm",2000,174614,null],
    ["dom",2000,8562623,52],
    ...
    ["cmr",2010,20590666,51.3],
    ["lbr",2010,3957990,38.2]
  ]
}
```
