# Waffle Server - ng2 solution

## Deployment instruction

### Install gapminder-modular repo
```bash
git clone git@github.com:valor-software/gapminder-modular.git
cd gapminder-modular
```

### Establish auth0-server (default port 8001)
```bash
cd auth0-server/
ASSESS_CONTROL_PORT=5000 npm run establish
```

### Install waffle-server repo
```bash
git clone git@github.com:valor-software/waffle-server.git
cd waffle-server/
```

### Run waffle-server backend (in new tab, default port 3000)
```bash
# required env variables
### AWS_ACCESS_KEY_ID
### AWS_SECRET_ACCESS_KEY
### S3_BUCKET
AWS_SECRET_ACCESS_KEY=<AWS_SECRET_ACCESS_KEY> AWS_ACCESS_KEY_ID=<AWS_ACCESS_KEY_ID> S3_BUCKET=<S3_BUCKET> node ./server.js
```

### Run waffle-server frontend (in new tab, default port 5000)
```bash
cd ws.public2/
npm run establish
```

### Open in browser `http://localhost:5000/`

### If you don't have access for login - ask @buchslava
