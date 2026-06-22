FROM node:20-slim
# fontconfig is required by @napi-rs/canvas's Skia font subsystem on Linux.
# Card fonts (DejaVu Sans / Mono) are bundled in src/assets/fonts and
# registered by src/renderers/fontSetup.js, so no system font packages needed.
RUN apt-get update \
 && apt-get install -y --no-install-recommends fontconfig \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
ENV NODE_ENV=production
CMD ["npm", "start"]
