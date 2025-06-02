# syntax=docker/dockerfile:1

# Comments are provided throughout this file to help you get started.
# If you need more help, visit the Dockerfile reference guide at
# https://docs.docker.com/go/dockerfile-reference/

# Want to help us make this template better? Share your feedback here: https://forms.gle/ybq9Krt8jtBL3iCk7

ARG NODE_VERSION=20.9.0

################################################################################
# Use node image for base image for all stages.
FROM node:${NODE_VERSION}-alpine as base

# Set working directory for all build stages.
WORKDIR /usr/src/app


################################################################################
# Create a stage for installing production dependecies.
FROM base as deps

# Copy root package.json and lockfile
COPY package.json package-lock.json ./

# Copy all workspace package.jsons (required for proper install)
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies from the root, which will also install workspaces
RUN npm install --omit=dev

################################################################################
# Create a stage for building the application.
FROM deps as build

# Copy root package.json and lockfile
COPY package.json package-lock.json ./

# Copy all workspace package.jsons (required for proper install)
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install dependencies from the root, which will also install workspaces
RUN npm install

# Copy the rest of the source files into the image.
COPY server ./server
# Run the build script.
RUN npm run build -w server

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base as final

# Use production node environment by default.
ENV NODE_ENV production

# Run the application as a non-root user.
USER node

# Copy package.json so that package manager commands can be used.
COPY package.json .

# Copy production dependencies only
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/server/dist ./dist
COPY --from=build /usr/src/app/server/package.json ./server/package.json


# Expose the port that the application listens on.
EXPOSE 80

# Run the application.
CMD ["npm", "run", "start", "-w", "server"]
