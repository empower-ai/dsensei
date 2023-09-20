# Base image for React Native frontend
FROM node:latest

RUN apt-get update && \
    apt-get install -y python3.11 python3-pip python3.11-venv

# Install backend dependencies
WORKDIR /app/backend
COPY /backend/requirements.txt /app/backend/requirements.txt
RUN python3 -m venv /opt/venv
RUN . /opt/venv/bin/activate && pip install -r requirements.txt

# Install frontend dependencies, copy frontend files and build frontend
WORKDIR /app/frontend
COPY /frontend/package.json /app/frontend/package.json
COPY /frontend/pnpm-lock.yaml /app/frontend/pnpm-lock.yaml
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY /frontend /app/frontend
RUN npm run build

# Copy backend files
COPY ./backend /app/backend
WORKDIR /app/backend

# Expose the desired port (change if necessary)
EXPOSE 5001

# Run Flask application
CMD . /opt/venv/bin/activate && exec python run.py
