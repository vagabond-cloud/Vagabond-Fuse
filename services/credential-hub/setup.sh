#!/bin/bash

# Setup script for Credential Hub - Production Ready Proof Service
# This script installs Node.js dependencies and prepares the environment

set -e

echo "🚀 Setting up Credential Hub Production Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    echo "   You can download it from: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$MAJOR_VERSION" -lt 16 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js version $NODE_VERSION detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm detected"

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Node.js dependencies installed successfully"
else
    echo "❌ Failed to install Node.js dependencies"
    exit 1
fi

# Check if Python Poetry is installed
if ! command -v poetry &> /dev/null; then
    echo "⚠️  Poetry is not installed. Please install Poetry first:"
    echo "   curl -sSL https://install.python-poetry.org | python3 -"
    echo "   Or follow instructions at: https://python-poetry.org/docs/#installation"
    exit 1
fi

echo "✅ Poetry detected"

# Install Python dependencies
echo "📦 Installing Python dependencies..."
poetry install

if [ $? -eq 0 ]; then
    echo "✅ Python dependencies installed successfully"
else
    echo "❌ Failed to install Python dependencies"
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p circuits
mkdir -p /tmp/zkp_proofs

echo "✅ Directories created"

# Check if circuit files exist in examples
EXAMPLES_CIRCUITS="../../../examples/eudi-toolkit/circuits/selective-disclosure"
if [ -d "$EXAMPLES_CIRCUITS" ]; then
    echo "✅ Circuit files found in examples directory"
    if [ -f "$EXAMPLES_CIRCUITS/verification_key.json" ]; then
        echo "✅ Verification key found"
    else
        echo "⚠️  Verification key not found in examples"
    fi
else
    echo "⚠️  Circuit files not found in examples directory"
    echo "   The service will work but may need circuit files for full functionality"
fi

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Start the service: poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 8001"
echo "   2. Access API docs: http://localhost:8001/api/docs"
echo "   3. Check circuits: curl http://localhost:8001/circuits"
echo ""
echo "🔧 For production deployment:"
echo "   - Ensure circuit files are properly configured"
echo "   - Set up proper database connections"
echo "   - Configure logging and monitoring"
echo "   - Set environment variables for security"
echo ""
echo "📖 See README.md for detailed usage instructions" 