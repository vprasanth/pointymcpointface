FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
