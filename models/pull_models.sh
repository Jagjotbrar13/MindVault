#!/bin/bash
set -e
echo "Pulling all MindVault models..."
ollama pull mistral:7b
ollama pull llama3:8b
ollama pull phi3:mini
ollama pull llava:7b
ollama pull nomic-embed-text
echo "All models ready."
