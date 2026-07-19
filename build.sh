#!/bin/bash

# Build script for Vercel deployment
echo "🚀 Starting build process..."

# Build client (React app)
echo "📦 Building client..."
cd client
npm install
npm run build
cd ..

echo "✅ Build completed successfully!"
