FROM node:20-alpine

WORKDIR /app
COPY simulator/simulator.js ./simulator.js

USER node
CMD ["node", "simulator.js"]
