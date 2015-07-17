// import sessions to user
MATCH (n:ImportSessions),(u:Users) where u._id = n.user create (n)-[:user]->(u)
// import sessions to data source
MATCH (n:ImportSessions),(u:DataSources) where u._id = n.ds create (n)-[:data_source]->(u)

// data sources to data source type
MATCH (n:DataSources),(u:DataSourceTypes) where u._id = n.dst create (n)-[:data_source_type]->(u)
// data sources to user
MATCH (n:DataSources),(u:Users) where u._id = n.user create (n)-[:user]->(u)

// import data to import sessions
MATCH (n:ImportData),(u:ImportSessions) where u._id in n.importSessions create (n)-[:user]->(u)

// analysis sessions to user
MATCH (n:AnalysisSessions),(u:Users) where u._id = n.user create (n)-[:user]->(u)
// analysis sessions to import session
MATCH (n:AnalysisSessions),(u:ImportSessions) where u._id = n.importSession create (n)-[:import_session]->(u)

// indicators to AnalysisSessions
MATCH (n:Indicators),(u:AnalysisSessions) where u._id in n.analysisSessions create (n)-[:analysis_session]->(u)

// indicators to Coordinates
//MATCH (n:Indicators),(u:Coordinates) where u._id in n.coordinates create (n)-[:coordinates]->(u)

// Coordinates to Dimensions
//MATCH (n:Coordinates),(u:Dimensions) where u._id in n.dimensions create (n)-[:dimensions]->(u)
// Coordinates to AnalysisSessions
MATCH (n:Coordinates),(u:AnalysisSessions) where u._id in n.analysisSessions create (n)-[:analysis_session]->(u)

// IndicatorValues to DimensionValues
MATCH (n:IndicatorValues),(u:DimensionValues) where u._id in n.ds create (n)-[:dimension_values]->(u)

// IndicatorValues to Coordinates
MATCH (n:IndicatorValues),(u:Coordinates) where u._id = n.coordinates create (n)-[:coordinates]->(u)

// IndicatorValues to Indicators
MATCH (n:IndicatorValues),(u:Indicators) where u._id = n.indicator create (n)-[:indicator]->(u)

// IndicatorValues to AnalysisSessions
MATCH (n:IndicatorValues),(u:AnalysisSessions) where u._id in n.analysisSessions create (n)-[:analysis_session]->(u)


//MATCH (d:Dimensions),(dv:DimensionValues) where d._id = dv.dimension create (d)-[:with_dv]->(dv)

// try 1
// indicators to Coordinates
MATCH (n:Indicators),(u:Coordinates) where u._id in n.coordinates create (n)-[:indicator_coordinates]->(u)

// Coordinates to Dimensions
MATCH (n:Coordinates),(u:Dimensions) where u._id in n.dimensions create (n)-[:coordinate_dimensions]->(u)

// Dimensions to DimensionValues
MATCH (d:Dimensions),(dv:DimensionValues) where d._id = dv.dimension create (d)-[:dimension_values]->(dv)

// DimensionValues to IndicatorValues
MATCH (dv:DimensionValues),(iv:IndicatorValues) where dv._id in dv.ds create (d)-[:with_dv]->(dv)


try 2 - works!
// Indicators to IndicatorValues
create index on :IndicatorValues(indicator)
MATCH (n:Indicators),(u:IndicatorValues) where n._id = u.indicator create (n)-[:has_indicator_values]->(u)

create index on :IndicatorValues(ds)
MATCH (n:IndicatorValues),(u:DimensionValues) where u._id in n.ds create (n)-[:has_dimension_values]->(u)

// Dimensions to DimensionValues
create index on :DimensionValues(dimension)
MATCH (d:Dimensions),(dv:DimensionValues) where d._id = dv.dimension create (d)-[:has_dimension_values]->(dv)
