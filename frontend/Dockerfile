FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Expose the Vite default port
EXPOSE 5173

# Start Vite in dev mode and expose it to the host network so Docker can port-forward it
CMD ["npm", "run", "dev", "--", "--host"]
