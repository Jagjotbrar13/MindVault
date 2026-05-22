#!/bin/bash
set -e
echo "Setting up MindVault..."
if ! command -v ollama &> /dev/null; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.ai/install.sh | sh
fi
bash models/pull_models.sh
mkdir -p storage/uploads storage/images storage/thumbnails storage/screenshots storage/chroma
cp .env.example .env
docker-compose up --build -d
echo "MindVault running at http://localhost:3000"
