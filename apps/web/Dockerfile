FROM node:20-alpine

WORKDIR /workspace

COPY package.json package.json
COPY tsconfig.base.json tsconfig.base.json
COPY turbo.json turbo.json
COPY packages/shared packages/shared
COPY apps/web apps/web

RUN npm install
RUN npm run build --workspace @blindspot/shared
RUN npm run build --workspace @blindspot/web

EXPOSE 3000

CMD ["npm", "run", "start", "--workspace", "@blindspot/web"]

