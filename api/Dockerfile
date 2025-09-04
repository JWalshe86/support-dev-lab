FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json package-lock.json* ./
RUN npm install || true
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]
