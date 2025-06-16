# EU Digital Identity Wallet Simulation

This simulation demonstrates a real-world implementation of the European Digital Identity Wallet in accordance with the eIDAS 2.0 regulation using the Vagabond-Fuse components.

## Overview

The EU Digital Identity Wallet initiative aims to provide citizens across all EU Member States with secure digital identity wallets that can be used for cross-border authentication and identity verification. This simulation demonstrates how the Vagabond-Fuse components can be used to implement this system.

Key features demonstrated:

1. **Decentralized Identity Management**:

   - Creation of DIDs for citizens and authorities
   - Management of verifiable credentials in digital wallets
   - Cross-border recognition of digital identities

2. **Verifiable Credentials**:

   - National ID issuance by Member State authorities
   - Address attestations
   - Educational qualifications
   - Qualified electronic signatures
   - eHealth records
   - Payment authorizations

3. **Privacy-Preserving Authentication**:

   - Selective disclosure of personal attributes
   - Minimal data sharing based on service requirements
   - Age verification without revealing exact date of birth

4. **Cross-Border Service Access**:

   - Authentication with services in different Member States
   - Recognition of credentials across borders
   - Standardized identity verification

5. **XRPL Integration**:
   - Digital Euro CBDC issuance and transfers
   - Tokenized credentials on XRPL
   - Immutable audit trails for business agreements
   - Secure payment authorization
   - Privacy-preserving digital voting

## Components Used

The simulation integrates the following Vagabond-Fuse components:

- **Wallet Kit**: For secure storage and management of digital identity credentials
- **DID Gateway**: For creating and managing decentralized identifiers
- **Policy Utils**: For defining and enforcing access control policies
- **Credential Hub**: For issuing and verifying verifiable credentials
- **XRPL Adapter**: For integrating with the XRP Ledger for tokenized credentials and payments

## XRPL Integration

The simulation includes integration with the XRP Ledger (XRPL) for various digital identity use cases. You can run the simulation with either:

1. **Mock XRPL Implementation**: (Default) Simulates XRPL operations without requiring an actual connection to the XRPL network.
2. **Real XRPL Testnet Connection**: Connects to the actual XRPL Testnet for real blockchain transactions.

### Using the Real XRPL Testnet

To use the real XRPL Testnet implementation:

1. Make sure you have installed the XRPL library:

   ```bash
   npm install xrpl
   ```

2. The simulation will automatically attempt to connect to the XRPL Testnet. If the connection fails, it will gracefully fall back to the mock implementation.

3. The simulation includes error handling to ensure it can continue running even if there are network issues or if the XRPL Testnet is unavailable.

### Implementation Details

The real XRPL adapter implementation:

- Connects to the XRPL Testnet using the WebSocket API
- Creates funded testnet wallets for citizens and authorities
- Issues tokens using trust lines and payments
- Records transactions with memos for audit trails
- Handles network errors gracefully with fallback mechanisms

## eIDAS 2.0 Alignment

This simulation aligns with the eIDAS 2.0 regulation in several ways:

1. **Trust Levels**: Implements Low, Substantial, and High assurance levels
2. **Qualified Credentials**: Supports qualified electronic signatures and seals
3. **Cross-Border Recognition**: Enables mutual recognition of digital identities
4. **Selective Disclosure**: Allows sharing only necessary personal attributes
5. **User Control**: Puts citizens in control of their identity data

## Simulation Scenarios

The simulation demonstrates several real-world scenarios:

1. **Cross-Border Authentication**: Spanish citizen accessing German public service
2. **Age Verification**: French minor attempting to access age-restricted service
3. **Digital Signature**: Creating qualified electronic signatures for documents
4. **Diploma Recognition**: Recognition of educational qualifications across borders
5. **Digital Euro Issuance**: Central Bank issuing CBDC tokens to citizens
6. **Cross-Border Payments**: Making payments between citizens in different countries
7. **Tokenized Credentials**: Issuing and verifying educational credentials on XRPL
8. **Cross-Border Healthcare**: German citizen accessing Spanish healthcare while on vacation
9. **Secure Payment Authorization**: Using verifiable credentials for payment authorization
10. **Business Data Sharing**: Secure data sharing between businesses with XRPL audit trail
11. **Secure Digital Voting**: Privacy-preserving voting using anonymous credentials and XRPL

## Running the Simulation

To run the simulation:

```bash
# Navigate to the examples directory
cd examples

# Run the simulation using the provided script
./simulation/run-eu-simulation.sh

# Or directly with tsx
npx tsx simulation/eu-digital-identity-simulation.ts
```

## Extending the Simulation

You can extend this simulation by:

1. Adding more credential types (driver's license, professional qualifications, etc.)
2. Implementing revocation mechanisms for compromised credentials
3. Adding more complex policy rules for service access
4. Implementing cross-device synchronization for digital wallets
5. Adding offline credential verification capabilities
6. Integrating with other blockchain networks beyond XRPL
7. Implementing advanced privacy-preserving cryptography (ZKPs)
8. Adding biometric authentication for credential usage
9. Implementing more advanced XRPL features like NFTs and hooks

## Related Resources

- [European Digital Identity Framework](https://digital-strategy.ec.europa.eu/en/policies/european-digital-identity)
- [eIDAS 2.0 Regulation](https://digital-strategy.ec.europa.eu/en/policies/eidas-regulation)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/)
- [XRP Ledger Documentation](https://xrpl.org/docs.html)
- [EU Digital Euro Project](https://www.ecb.europa.eu/paym/digital_euro/html/index.en.html)
