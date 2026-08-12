FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/compiler/package.json packages/compiler/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm --workspace @promptvault/web run build && npm --workspace @promptvault/api run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 WEB_ROOT=/app/web
WORKDIR /app
RUN npm init -y >/dev/null && npm install --omit=dev --ignore-scripts fastify@5.5.0 @fastify/static@10.1.3
COPY --from=build /app/apps/api/dist ./api
COPY --from=build /app/apps/web/dist ./web
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "api/server.js"]
