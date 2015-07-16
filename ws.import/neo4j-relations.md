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
MATCH (n:Indicators),(u:Coordinates) where u._id in n.coordinates create (n)-[:coordinates]->(u)

// Coordinates to Dimensions
MATCH (n:Coordinates),(u:Dimensions) where u._id in n.dimensions create (n)-[:dimensions]->(u)
// Coordinates to AnalysisSessions
MATCH (n:Coordinates),(u:AnalysisSessions) where u._id in n.analysisSessions create (n)-[:analysis_session]->(u)

