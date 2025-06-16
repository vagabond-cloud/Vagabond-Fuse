#!/bin/bash

# EU Digital Identity Wallet Simulation Runner

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}   VAGABOND FUSE - EU Digital Identity Wallet Simulation with XRPL        ${NC}"
echo -e "${BLUE}================================================================${NC}"
echo

echo "This simulation demonstrates the SYNNQ FUSE - European Digital Identity Wallet"
echo "in accordance with eIDAS 2.0 regulation and XRPL integration."
echo
echo "Scenarios demonstrated:"
echo "1. Cross-Border Authentication"
echo "2. Age Verification"
echo "3. Digital Signature"
echo "4. Diploma Recognition"
echo "5. Digital Euro Issuance"
echo "6. Cross-Border Payments"
echo "7. Tokenized Credentials"
echo "8. Cross-Border Healthcare"
echo "9. Secure Payment Authorization"
echo "10. Business Data Sharing with Audit Trail"
echo "11. Secure Digital Voting"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed. Please install Node.js to run this simulation.${NC}"
    exit 1
fi

# Check if tsx is installed
if ! command -v tsx &> /dev/null; then
    echo -e "${YELLOW}TSX is not installed. Installing...${NC}"
    npm install -g tsx
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install TSX. Please install it manually with 'npm install -g tsx'.${NC}"
        exit 1
    fi
    echo -e "${GREEN}TSX installed successfully.${NC}"
fi

# Check if uuid is installed
if ! npm list uuid &> /dev/null; then
    echo -e "${YELLOW}UUID package not found. Installing...${NC}"
    npm install uuid
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install UUID. Please install it manually with 'npm install uuid'.${NC}"
        exit 1
    fi
    echo -e "${GREEN}UUID installed successfully.${NC}"
fi

# Check XRPL status using our adapter creator
ADAPTER_CHECK=$(tsx create-adapter.ts | grep "Adapter type:" | awk '{print $3}')

if [ "$ADAPTER_CHECK" == "Real" ]; then
    echo -e "${GREEN}XRPL package detected. The simulation will attempt to connect to the XRPL Testnet.${NC}"
    echo -e "${YELLOW}If connection fails, it will fall back to the mock implementation.${NC}"
else
    echo -e "${YELLOW}XRPL package not found. Would you like to install it for real XRPL integration? (y/n)${NC}"
    read -r answer
    if [[ "$answer" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installing XRPL package...${NC}"
        npm install xrpl
        if [ $? -ne 0 ]; then
            echo -e "${RED}Failed to install XRPL. The simulation will run with mock implementation.${NC}"
        else
            echo -e "${GREEN}XRPL package installed successfully.${NC}"
            echo -e "${GREEN}The simulation will connect to the XRPL Testnet.${NC}"
        fi
    else
        echo -e "${YELLOW}Skipping XRPL installation. The simulation will run with mock implementation.${NC}"
    fi
fi

echo
echo -e "${GREEN}Running simulation...${NC}"
echo

# Run the simulation
tsx eu-digital-identity-simulation.ts

# Check if the simulation ran successfully
if [ $? -eq 0 ]; then
    echo
    echo -e "${GREEN}Simulation completed successfully!${NC}"
    echo -e "${BLUE}===========================================================${NC}"
    echo -e "${BLUE}   Simulation Completed                                  ${NC}"
    echo -e "${BLUE}===========================================================${NC}"
else
    echo
    echo -e "${RED}Simulation failed. Please check the error messages above.${NC}"
fi 