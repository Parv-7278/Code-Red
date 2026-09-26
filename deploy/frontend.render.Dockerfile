FROM node:20-alpine AS build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_DATA_MODE=CONNECTED
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_BACKEND_URL=/backend \
    VITE_ML_API_URL=/ml \
    VITE_SOCKET_URL= \
    VITE_SOCKET_PATH=/backend/socket.io \
    VITE_DATA_MODE=${VITE_DATA_MODE} \
    VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}

RUN test -n "$VITE_SUPABASE_URL" \
    && test -n "$VITE_SUPABASE_ANON_KEY" \
    && npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx.render.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:10000/healthz || exit 1
