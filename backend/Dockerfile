FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# npm ci installs exactly what package-lock.json pins -> reproducible builds
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
