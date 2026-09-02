FROM node:20-slim
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/game-contracts/package.json packages/game-contracts/package.json
RUN npm install
COPY apps/web apps/web
COPY packages packages
WORKDIR /repo/apps/web
CMD ["npm", "run", "dev", "--", "--host"]
