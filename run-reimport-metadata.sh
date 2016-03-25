#NODE_ENV=development \
#LOG_LEVEL=debug \
#LOG_TRANSPORTS=console,file \
MONGODB_URL=mongodb://@localhost:27017/ws_test \
NEO4J_URL=http://neo4j:neo4j@localhost:7474 \
DATA_VERSION=metadata \
node csv_data_mapping_cli/index.js
