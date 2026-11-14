# Patchwork — Hugging Face Docker Space (also works on any Docker host).
FROM node:24-slim

# HF Spaces run containers as uid 1000; the node image's "node" user already has it.
USER node
WORKDIR /home/node/app

COPY --chown=node package.json package-lock.json ./
RUN npm ci

COPY --chown=node . .
RUN npm run build && npm prune --omit=dev && mkdir -p data

ENV NODE_ENV=production \
    PORT=7860
EXPOSE 7860
CMD ["node", "server/index.js"]
