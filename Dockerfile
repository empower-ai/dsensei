# Base image for React Native frontend
FROM node:latest

# Copy project files
COPY ./backend /app/backend
COPY ./frontend /app/frontend

# Install dependencies and build frontend
WORKDIR /app/frontend
RUN npm install -g pnpm && \
    pnpm install && \
    npm run build

# Install Python dependencies
WORKDIR /app/backend
RUN apt-get update && \
    apt-get install -y python3.11 python3-pip python3.11-venv
RUN python3 -m venv /opt/venv
RUN . /opt/venv/bin/activate && pip install -r requirements.txt

# Expose the desired port (change if necessary)
EXPOSE 5000

# Run Flask application
CMD . /opt/venv/bin/activate && exec flask run -h 0.0.0.0
