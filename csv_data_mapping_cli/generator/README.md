# Usage

In order to start generation of vizabi csv based on Waffle-Server data you need to run following command:

`node index generationSchemas.json`

Where `generationSchemas.json` is the file that contains schemas for csv to be generated. Here is an example:
 ```json
 [
   {
     "file": "geos.csv",
     "headers": ["geo","geo.name","geo.cat","geo.region","geo.lat","geo.lng"],
     "wsProperties": ["geo","geo.name","geo.cat","geo.region","geo.lat","geo.lng"],
     "endpoint": "geos"
   },
   {
     "file": "measureValues.csv",
     "headers": ["geo","time","pop", "gdp_pc", "gini", "u5mr"],
     "wsProperties": ["geo","time","pop", "gdp_pc", "gini", "u5mr"],
     "endpoint": "measureValues",
     "query": "time=2015"
   }
 ]
 ```
  ## Options
 - `file` - the name of the generated csv file
 - `headers` - headers inside the generated csv file
 -  `wsProperties` - properties that will be available in the response objects and which will be mapped to `headers`
 - `endpoint` - predefined inside of the generation script value that knows which route to invoke in order to get the data.
 - `query (optional)` - url params that will be used during the route invocation. Should be supplied in form of `key=value&key=value...`

 Also by supplying env param `WS_URL` default Waffle-Server url (http://localhost:3000) can be overridden.
