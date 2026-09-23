FROM node:20-slim

# Bruno CLI ("bru") runs .bru API collections headless.
RUN npm install -g @usebruno/cli@1.20.0

WORKDIR /collection

# Keep the container running so you can exec commands on demand, e.g.:
#   docker compose exec bruno bru run --env Local
CMD ["tail", "-f", "/dev/null"]
