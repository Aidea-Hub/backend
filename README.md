# backend

## Setup
1. Git clone repository
```
git clone https://github.com/Aidea-Hub/backend.git
```
2. Create `.env` that point to [ai cloud functions](https://github.com/Aidea-Hub/ai-backend) in `backend/functions`
```
API_GENERATE_RESEARCH=
API_GENERATE_REFLECTION=
```

## Useful commands 
To run locally
```
firebase emulators:start
```

To only run functions
```
firebase emulators:start --only functions
```

Run in debug mode for functions
```
cd backend/functions
npm run serve
```

To deploy
```
npm run build
npm run deploy
```
