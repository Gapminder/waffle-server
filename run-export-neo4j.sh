#NODE_ENV=development \
#LOG_LEVEL=debug \
#LOG_TRANSPORTS=console,file \
MONGODB_URL=mongodb://@localhost:27017/ws_test \
NEO4J_URL=http://neo4j:neo4j@localhost:7474 \
DATA_VERSION=export-neo4j \
CLEAR_ALL_MONGO_DB_COLLECTIONS_BEFORE_IMPORT=false \
node csv_data_mapping_cli/index.js
