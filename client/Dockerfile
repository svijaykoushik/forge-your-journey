# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=22.14.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app


################################################################################
# Create a stage for installing production dependecies.
FROM base as deps

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps as build

# Define a build arguments for the Gemini API Key
# and image generation configuration
# This ARG is scoped to the 'build' stage.
ARG IMAGE_GENERATION_ENABLED
ARG PROXY_URL

ENV IMAGE_GENERATION_ENABLED=$IMAGE_GENERATION_ENABLED
ENV PROXY_URL=$PROXY_URL

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

RUN npm install

# Copy the rest of the source files into the image.
COPY client ./client
# Run the build script.
RUN npm run build -w client

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM nginx:alpine as final

# Remove the default Nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy your custom Nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/forge-your-journey.conf

# Copy the built React application from the build stage into the Nginx web root.
# The `root` in your nginx.conf is `/srv/dist`, so we will copy to that path.
# Remember that your React app's build output is in `dist`.
COPY --from=build /usr/src/app/client/dist/forge-your-journey /srv/forge-your-journey
# Expose the port that Nginx listens on.
EXPOSE 80

# Start Nginx when the container starts.
CMD ["nginx", "-g", "daemon off;"]
