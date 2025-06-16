# EU Digital Identity Wallet Simulation

This simulation demonstrates a real-world implementation of the European Digital Identity Wallet in accordance with the eIDAS 2.0 regulation using the Vagabond-Fuse components.

## Overview

The simulation showcases how the EU Digital Identity Wallet can be used in various cross-border scenarios, including authentication, credential verification, and secure data sharing. It also demonstrates integration with the XRP Ledger (XRPL) for blockchain-based identity and payment use cases.

## Features

- **Cross-Border Authentication**: EU citizens can authenticate with services in other Member States
- **Selective Disclosure**: Users can share only the required attributes from their credentials
- **Qualified Electronic Signatures**: Create legally binding signatures with your digital identity
- **Age Verification**: Privacy-preserving age verification for online services
- **Diploma Recognition**: Cross-border recognition of educational qualifications
- **Digital Euro Integration**: Simulation of CBDC issuance and payments
- **XRPL Integration**: Real blockchain integration for identity and payment use cases

## XRPL Integration

The simulation includes integration with the XRP Ledger (XRPL) for blockchain-based use cases:

- **Digital Euro Issuance**: Central Bank Digital Currency (CBDC) tokens
- **Cross-Border Payments**: Direct payments between EU citizens
- **Tokenized Credentials**: Representing credentials as tokens on XRPL
- **Business Data Sharing**: Secure data sharing with immutable audit trail
- **Digital Voting**: Privacy-preserving voting with blockchain verification

The simulation can run in two modes:

1. **Mock Mode**: Uses a mock XRPL adapter for demonstration purposes (default)
2. **Real Mode**: Connects to the XRPL Testnet for actual blockchain transactions

### Using Real XRPL Integration

To use the real XRPL integration, you need to install the XRPL package:

```bash
npm install xrpl
```

When running the simulation with the XRPL package installed, it will attempt to connect to the XRPL Testnet. If the connection fails, it will automatically fall back to the mock implementation.

## Running the Simulation

To run the simulation, use the provided script:

```bash
./run-eu-simulation.sh
```

The script will check for dependencies and prompt you to install them if necessary.

## Scenarios Demonstrated

1. Cross-Border Authentication
2. Age Verification
3. Digital Signature
4. Diploma Recognition
5. Digital Euro Issuance
6. Cross-Border Payments
7. Tokenized Credentials
8. Cross-Border Healthcare
9. Secure Payment Authorization
10. Business Data Sharing with Audit Trail
11. Secure Digital Voting

## Components Used

- **Wallet Kit**: For secure storage and management of digital identity credentials
- **DID Gateway**: For creating and managing decentralized identifiers
- **Policy Utils**: For defining and enforcing access control policies
- **Credential Hub**: For issuing and verifying verifiable credentials
- **XRPL Adapter**: For integration with the XRP Ledger

## Requirements

- Node.js 16+
- TSX (TypeScript execution engine)
- UUID package
- XRPL package (optional, for real blockchain integration)
