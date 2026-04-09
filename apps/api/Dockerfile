FROM node:20-alpine

WORKDIR /workspace

COPY package.json package-lock.json tsconfig.base.json turbo.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm install
RUN npm run build --workspace @blindspot/shared
RUN npm run db:generate --workspace @blindspot/api
RUN npm run build --workspace @blindspot/api

EXPOSE 3101

CMD ["npm", "run", "start", "--workspace", "@blindspot/api"]
