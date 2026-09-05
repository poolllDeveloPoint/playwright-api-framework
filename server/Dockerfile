FROM node:20-alpine

WORKDIR /app

# Copy package definitions
COPY package*.json tsconfig.json ./

# Install packages
RUN npm install

# Copy server source and configs
COPY server ./server

EXPOSE 3001

CMD ["npx", "tsx", "server/src/index.ts"]
