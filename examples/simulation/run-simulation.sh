#!/bin/bash

# EU Digital ID Wallet Simulation Runner
# This script runs the EU Digital ID Wallet simulation

# Set colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}  EU Digital ID Wallet Simulation Runner ${NC}"
echo -e "${GREEN}=========================================${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed.${NC}"
    echo -e "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${YELLOW}Warning: Node.js version $NODE_VERSION detected.${NC}"
    echo -e "${YELLOW}This simulation works best with Node.js 16 or higher.${NC}"
    echo -e "${YELLOW}Continue anyway? (y/n)${NC}"
    read -r CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# Check if xrpl package is installed
if ! npm list xrpl &> /dev/null; then
    echo -e "${YELLOW}XRPL package not found. Installing xrpl...${NC}"
    npm install xrpl
fi

echo -e "${GREEN}All dependencies are installed.${NC}"
echo -e "${GREEN}Running the EU Digital ID Wallet simulation...${NC}"
echo ""

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Run the JavaScript simulation
node "$SCRIPT_DIR/eu_digital_id_simulation.js"

# Check if simulation ran successfully
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}Simulation completed successfully!${NC}"
    echo -e "${GREEN}For more information about the simulation, see examples/simulation/README.md${NC}"
else
    echo ""
    echo -e "${RED}Simulation failed.${NC}"
    echo -e "${RED}Please check the error messages above.${NC}"
fi 