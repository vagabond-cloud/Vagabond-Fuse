/**
 * Education Use Case
 * 
 * This module provides functionality for education-related use cases
 * such as issuing and verifying educational credentials.
 */

import { v4 as uuidv4 } from 'uuid';
import { CredentialManager, VerificationResult } from '../core/credentials';
import { ZKProofManager } from '../core/zkp';
import { StatusManager, StatusType } from '../core/status';
import { VerifiableCredential } from '../core/types';

export interface DiplomaData {
  studentName: string;
  studentId?: string;
  dateOfBirth: string;
  institution: string;
  institutionId: string;
  degree: string;
  field: string;
  awardDate: string;
  graduationDate?: string;
  grade?: string;
  honors?: string[];
  curriculum?: string[];
  registrationNumber?: string;
}

export interface CourseCredentialData {
  studentName: string;
  studentId?: string;
  institution: string;
  institutionId: string;
  courseName: string;
  courseId: string;
  description?: string;
  credits: number;
  startDate: string;
  completionDate: string;
  grade?: string;
  instructor?: string;
  skills?: string[];
}

export class EducationUseCase {
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
   * Issue a diploma credential
   * @param data The diploma data
   * @param issuerId The ID of the issuer (educational institution)
   * @param subjectId The ID of the subject (student)
   * @returns The issued credential
   */
  async issueDiploma(
    data: DiplomaData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/education/diploma/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'DiplomaCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: undefined, // Diplomas typically don't expire
      credentialSubject: {
        id: subjectId,
        type: 'Diploma',
        studentName: data.studentName,
        studentId: data.studentId,
        dateOfBirth: data.dateOfBirth,
        institution: data.institution,
        institutionId: data.institutionId,
        degree: data.degree,
        field: data.field,
        awardDate: data.awardDate,
        graduationDate: data.graduationDate,
        grade: data.grade,
        honors: data.honors,
        curriculum: data.curriculum,
        registrationNumber: data.registrationNumber
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

    console.log('Diploma Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Issue a course credential
   * @param data The course credential data
   * @param issuerId The ID of the issuer (educational institution)
   * @param subjectId The ID of the subject (student)
   * @returns The issued credential
   */
  async issueCourseCredential(
    data: CourseCredentialData,
    issuerId: string,
    subjectId: string
  ): Promise<VerifiableCredential> {
    // Create the credential
    const credential: VerifiableCredential = {
      '@context': [
        'https://www.w3.org/2018/credentials/v1',
        'https://www.w3.org/2018/credentials/examples/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://eudi-wallet.eu/contexts/education/course/v1',
      ],
      id: `urn:uuid:${uuidv4()}`,
      type: ['VerifiableCredential', 'CourseCredential'],
      issuer: issuerId,
      issuanceDate: new Date().toISOString(),
      expirationDate: undefined, // Course credentials typically don't expire
      credentialSubject: {
        id: subjectId,
        type: 'Course',
        studentName: data.studentName,
        studentId: data.studentId,
        institution: data.institution,
        institutionId: data.institutionId,
        courseName: data.courseName,
        courseId: data.courseId,
        description: data.description,
        credits: data.credits,
        startDate: data.startDate,
        completionDate: data.completionDate,
        grade: data.grade,
        instructor: data.instructor,
        skills: data.skills
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

    console.log('Course Credential JWT:');
    console.log(JSON.stringify(credential));

    return credential;
  }

  /**
   * Verify a diploma credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyDiploma(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a diploma credential
    if (!credential.type.includes('DiplomaCredential')) {
      return {
        verified: false,
        error: 'Not a diploma credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type DiplomaCredential',
          },
        ],
      };
    }

    // For demo purposes, return a successful verification
    return {
      verified: true,
      checks: [
        { check: 'signature', valid: true },
        { check: 'status', valid: true }
      ],
    };
  }

  /**
   * Verify a course credential
   * @param credential The credential to verify
   * @returns The verification result
   */
  async verifyCourseCredential(credential: VerifiableCredential): Promise<VerificationResult> {
    // Check if this is a course credential
    if (!credential.type.includes('CourseCredential')) {
      return {
        verified: false,
        error: 'Not a course credential',
        checks: [
          {
            check: 'type',
            valid: false,
            error: 'Credential is not of type CourseCredential',
          },
        ],
      };
    }

    // For demo purposes, return a successful verification
    return {
      verified: true,
      checks: [
        { check: 'signature', valid: true },
        { check: 'status', valid: true }
      ],
    };
  }

  /**
   * Generate a proof of education
   * @param diplomaCredential The diploma credential
   * @param revealGrade Whether to reveal the grade
   * @returns A proof of education
   */
  async generateEducationProof(
    diplomaCredential: VerifiableCredential,
    revealGrade: boolean = false
  ): Promise<any> {
    // Define which attributes to reveal
    const revealAttributes = [
      'studentName',
      'institution',
      'degree',
      'field',
      'awardDate'
    ];
    
    // Optionally reveal grade
    if (revealGrade && diplomaCredential.credentialSubject.grade) {
      revealAttributes.push('grade');
    }
    
    // Generate a selective disclosure proof
    return this.zkpManager.generateProof(
      diplomaCredential,
      {
        id: `proof-${uuidv4()}`,
        credentialId: diplomaCredential.id,
        type: 'DiplomaProof',
        circuit: 'selective-disclosure',
        revealAttributes
      }
    );
  }

  /**
   * Generate a proof of skills
   * @param courseCredentials An array of course credentials
   * @returns A proof of skills acquired through courses
   */
  async generateSkillsProof(
    courseCredentials: VerifiableCredential[]
  ): Promise<any> {
    // For each course credential, generate a proof revealing only the skills
    const proofs = await Promise.all(
      courseCredentials.map(async (credential) => {
        return this.zkpManager.generateProof(
          credential,
          {
            id: `proof-${uuidv4()}`,
            credentialId: credential.id,
            type: 'CourseSkillsProof',
            circuit: 'selective-disclosure',
            revealAttributes: ['courseName', 'skills']
          }
        );
      })
    );
    
    // Combine the proofs into a skills portfolio
    return {
      id: `skills-portfolio-${uuidv4()}`,
      type: 'SkillsPortfolioProof',
      proofs,
      created: new Date().toISOString()
    };
  }
} 