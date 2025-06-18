/**
 * Travel Use Case
 * 
 * This module provides functionality for travel-related use cases such as
 * hotel booking and check-in using verifiable credentials.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface TravelIdentityData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber?: string;
  idCardNumber?: string;
  address?: {
    streetAddress: string;
    locality: string;
    region?: string;
    postalCode: string;
    country: string;
  };
  contactInformation?: {
    email: string;
    phone: string;
  };
}

export interface HotelBookingData {
  bookingReference: string;
  hotelName: string;
  checkInDate: string;
  checkOutDate: string;
  roomType: string;
  guestCount: number;
  totalAmount: string;
  currency: string;
}

export class TravelUseCase {
  private credentialManager: CredentialManager;
  private zkpManager: ZKProofManager;
  private statusManager: StatusManager;

  constructor(
    credentialManager: CredentialManager,
    zkpManager: ZKProofManager,
    statusManager: StatusManager
  ) {
    this.credentialManager = credentialManager;
    this.zkpManager = zkpManager;
    this.statusManager = statusManager;
  }

  /**
   * Issue a travel identity credential
   * @param data The travel identity data
   * @param issuerId The ID of the issuer
   * @param subjectId The ID of the subject
   * @returns The issued credential
   */
  async issueTravelIdentity(
    data: TravelIdentityData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/travel-identity/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'TravelIdentityCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 5 years
      credentialSubject: {
        id: subjectId,
        type: 'TravelIdentity',
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        nationality: data.nationality,
        passportNumber: data.passportNumber,
        idCardNumber: data.idCardNumber,
        address: data.address,
        contactInformation: data.contactInformation
      },
      // Add a simple mock proof for demonstration purposes
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${issuerId}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'mock_signature_for_demo_purposes_only',
      }
    };

    // Add credential status
    const statusEntry = this.statusManager.createStatus(credential.id, StatusType.ACTIVE);
    credential.credentialStatus = this.statusManager.createCredentialStatus(
      `https://eudi-wallet.eu/status/${uuidv4()}`,
      'StatusList2021Entry',
      statusEntry.id
    );

    console.log('Travel Identity Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a hotel booking credential
   * @param data The hotel booking data
   * @param issuerId The ID of the issuer (hotel)
   * @param subjectId The ID of the subject (guest)
   * @returns The issued credential
   */
  async issueHotelBooking(
    data: HotelBookingData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    // Format dates properly to ensure they're valid ISO strings
    const formatDate = (dateStr: string): string => {
      if (!dateStr) {
        throw new Error(`Date string is undefined or empty`);
      }
      
      try {
        const date = new Date(dateStr);
        // Check if date is valid
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${dateStr}`);
        }
        return date.toISOString();
      } catch (error) {
        console.error(`Error formatting date: ${dateStr}`, error);
        throw new Error(`Invalid date format: ${dateStr}`);
      }
    };

    // Validate required fields
    if (!data.checkInDate) {
      throw new Error('Check-in date is required');
    }
    
    if (!data.checkOutDate) {
      throw new Error('Check-out date is required');
    }

    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/hotel-booking/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'HotelBookingCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: formatDate(data.checkOutDate),
      credentialSubject: {
        id: subjectId,
        type: 'HotelBooking',
        bookingReference: data.bookingReference,
        hotelName: data.hotelName,
        checkInDate: formatDate(data.checkInDate),
        checkOutDate: formatDate(data.checkOutDate),
        roomType: data.roomType,
        guestCount: data.guestCount,
        totalAmount: data.totalAmount,
        currency: data.currency
      },
      // Add a simple mock proof for demonstration purposes
      proof: {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: `${issuerId}#keys-1`,
        proofPurpose: 'assertionMethod',
        proofValue: 'mock_signature_for_demo_purposes_only',
      }
    };

    // Add credential status
    const statusEntry = this.statusManager.createStatus(credential.id, StatusType.ACTIVE);
    credential.credentialStatus = this.statusManager.createCredentialStatus(
      `https://eudi-wallet.eu/status/${uuidv4()}`,
      'StatusList2021Entry',
      statusEntry.id
    );

    console.log('Hotel Booking Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a travel identity credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyTravelIdentity(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a travel identity credential
    if (!credential.type.includes('TravelIdentityCredential')) {
      return {
        verified: false,
        error: 'Not a travel identity credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type TravelIdentityCredential',
          },
        ],
      };
    }

    // For demo purposes, return a successful verification
    return {
      verified: true,
      checks: [
        { check: 'signature', valid: true },
        { check: 'expiry', valid: true },
        { check: 'status', valid: true }
      ],
    };
  }

  /**
   * Verify a hotel booking credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyHotelBooking(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a hotel booking credential
    if (!credential.type.includes('HotelBookingCredential')) {
      return {
        verified: false,
        error: 'Not a hotel booking credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type HotelBookingCredential',
          },
        ],
      };
    }

    // Check if the booking is still valid (not expired)
    const now = new Date();
    const checkOutDate = new Date(credential.credentialSubject.checkOutDate);
    if (checkOutDate < now) {
      return {
        verified: false,
        error: 'Booking has expired',
        checks: [
          {
            check: 'expiry',
            valid: false,
            error: 'Booking checkout date has passed',
          },
        ],
      };
    }

    // For demo purposes, return a successful verification
    return {
      verified: true,
      checks: [
        { check: 'signature', valid: true },
        { check: 'expiry', valid: true },
        { check: 'status', valid: true }
      ],
    };
  }

  /**
   * Generate a minimal proof for hotel check-in
   * @param identityCredential The travel identity credential
   * @param bookingCredential The hotel booking credential
   * @returns A proof that the person is the booking holder
   */
  async generateHotelCheckInProof(
    identityCredential: VerifiableCredential,
    bookingCredential: VerifiableCredential
  ): Promise<any> {
    // For hotel check-in, we need to reveal the name from the identity credential
    // and the booking reference from the booking credential
    const identityProof = await this.zkpManager.generateProof(
      identityCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: identityCredential.id,
        type: 'TravelIdentityProof',
        circuit: 'selective-disclosure',
        revealAttributes: ['firstName', 'lastName']
      }
    );

    const bookingProof = await this.zkpManager.generateProof(
      bookingCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: bookingCredential.id,
        type: 'HotelBookingProof',
        circuit: 'selective-disclosure',
        revealAttributes: ['bookingReference', 'checkInDate', 'checkOutDate']
      }
    );

    // Combine the proofs for a complete check-in package
    return {
      id: `hotel-checkin-${uuidv4()}`,
      type: 'HotelCheckInProof',
      identityProof,
      bookingProof,
      created: new Date().toISOString()
    };
  }
} 