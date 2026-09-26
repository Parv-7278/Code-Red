FROM node:20-bookworm-slim AS frontend-build

WORKDIR /build
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

FROM node:20-bookworm-slim AS backend-deps

WORKDIR /backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PATH=/opt/venv/bin:$PATH

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        libgomp1 \
        nginx \
        python3 \
        python3-pip \
        python3-venv \
        supervisor \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/venv

WORKDIR /app

COPY fastapi_backend/requirements.txt /app/fastapi/requirements.txt
RUN pip install -r /app/fastapi/requirements.txt

COPY fastapi_backend/ /app/fastapi/
COPY backend/src/ /app/backend/src/
COPY backend/package.json backend/package-lock.json /app/backend/
COPY --from=backend-deps /backend/node_modules /app/backend/node_modules
COPY simulator/simulator.js /app/simulator/simulator.js

COPY --from=frontend-build /build/dist /usr/share/nginx/html
COPY deploy/nginx.free.conf /etc/nginx/conf.d/default.conf
COPY deploy/supervisord.free.conf /etc/supervisor/conf.d/polaris.conf

RUN rm -f /etc/nginx/sites-enabled/default \
    && mkdir -p /var/log/supervisor /run/nginx

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=8s --retries=5 \
    CMD curl --fail --silent http://127.0.0.1:10000/healthz > /dev/null || exit 1

CMD ["/usr/bin/supervisord", "-n", "-c", "/etc/supervisor/supervisord.conf"]
