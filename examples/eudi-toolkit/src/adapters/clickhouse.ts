/**
 * ClickHouse Integration Adapter
 *
 * This adapter provides integration with ClickHouse for credential statistics.
 */

import { ClickHouse } from 'clickhouse';
import {
  CredentialStats,
  StatsPeriod,
  VerifiableCredential,
} from '../core/types';

// Define interfaces for ClickHouse query results
interface CountResult {
  count: string;
}

interface AvgTimeResult {
  avgTime: string;
}

interface CredTypeResult {
  credType: string;
  count: string;
}

interface IssuerResult {
  issuer: string;
  count: string;
}

export interface ClickHouseConfig {
  url: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class ClickHouseAdapter {
  private client: ClickHouse;
  private config: ClickHouseConfig;

  constructor(config: ClickHouseConfig) {
    this.config = config;
    this.client = new ClickHouse({
      url: config.url,
      port: config.port,
      basicAuth: {
        username: config.user,
        password: config.password,
      },
      format: 'json',
      config: {
        database: config.database,
      },
    });
  }

  /**
   * Initialize the ClickHouse database with required tables
   */
  async initialize(): Promise<void> {
    try {
      // Create the database if it doesn't exist
      await this.client
        .query(
          `
        CREATE DATABASE IF NOT EXISTS ${this.config.database}
      `
        )
        .toPromise();

      // Create credentials table
      await this.client
        .query(
          `
        CREATE TABLE IF NOT EXISTS ${this.config.database}.credentials (
          id String,
          type Array(String),
          issuer String,
          subject String,
          issuanceDate DateTime,
          expirationDate Nullable(DateTime),
          status String DEFAULT 'active',
          attributes String,
          timestamp DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (issuer, issuanceDate)
      `
        )
        .toPromise();

      // Create verifications table
      await this.client
        .query(
          `
        CREATE TABLE IF NOT EXISTS ${this.config.database}.verifications (
          id String,
          credentialId String,
          verifier String,
          success UInt8,
          verificationTime Float64,
          timestamp DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (credentialId, timestamp)
      `
        )
        .toPromise();

      // Create revocations table
      await this.client
        .query(
          `
        CREATE TABLE IF NOT EXISTS ${this.config.database}.revocations (
          id String,
          credentialId String,
          reason String,
          timestamp DateTime DEFAULT now()
        ) ENGINE = MergeTree()
        ORDER BY (credentialId, timestamp)
      `
        )
        .toPromise();

      console.log('ClickHouse database initialized');
    } catch (error) {
      console.error('Error initializing ClickHouse:', error);
      throw error;
    }
  }

  /**
   * Log a credential issuance
   * @param credential The issued credential
   */
  async logCredentialIssuance(credential: VerifiableCredential): Promise<void> {
    try {
      const issuer =
        typeof credential.issuer === 'string'
          ? credential.issuer
          : credential.issuer.id;

      const subject = credential.credentialSubject.id || 'unknown';

      // Convert attributes to JSON string
      const attributes = JSON.stringify(credential.credentialSubject);

      // Convert dates to ISO format
      const issuanceDate = new Date(credential.issuanceDate).toISOString();
      const expirationDate = credential.expirationDate
        ? new Date(credential.expirationDate).toISOString()
        : null;

      await this.client
        .insert('credentials', {
          id: credential.id,
          type: credential.type,
          issuer,
          subject,
          issuanceDate,
          expirationDate,
          attributes,
        })
        .toPromise();

      console.log(`Logged credential issuance: ${credential.id}`);
    } catch (error) {
      console.error('Error logging credential issuance:', error);
      throw error;
    }
  }

  /**
   * Log a credential verification
   * @param credentialId The ID of the verified credential
   * @param verifier The ID of the verifier
   * @param success Whether the verification was successful
   * @param verificationTime The time taken for verification (in milliseconds)
   */
  async logVerification(
    credentialId: string,
    verifier: string,
    success: boolean,
    verificationTime: number
  ): Promise<void> {
    try {
      await this.client
        .insert('verifications', {
          id: `verif-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          credentialId,
          verifier,
          success: success ? 1 : 0,
          verificationTime,
          timestamp: new Date().toISOString(),
        })
        .toPromise();

      console.log(`Logged verification for credential: ${credentialId}`);
    } catch (error) {
      console.error('Error logging verification:', error);
      throw error;
    }
  }

  /**
   * Log a credential revocation
   * @param credentialId The ID of the revoked credential
   * @param reason The reason for revocation
   */
  async logRevocation(credentialId: string, reason: string): Promise<void> {
    try {
      // Update the status in the credentials table
      await this.client
        .query(
          `
        ALTER TABLE credentials UPDATE status = 'revoked' WHERE id = '${credentialId}'
      `
        )
        .toPromise();

      // Insert into revocations table
      await this.client
        .insert('revocations', {
          id: `revoc-${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          credentialId,
          reason,
          timestamp: new Date().toISOString(),
        })
        .toPromise();

      console.log(`Logged revocation for credential: ${credentialId}`);
    } catch (error) {
      console.error('Error logging revocation:', error);
      throw error;
    }
  }

  /**
   * Get overall credential statistics
   * @returns Statistics about all credentials
   */
  async getCredentialStats(): Promise<CredentialStats> {
    try {
      // Get total issued
      const totalIssuedResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM credentials
      `
        )
        .toPromise();
      const totalIssued = parseInt(
        (totalIssuedResult[0] as CountResult).count,
        10
      );

      // Get total verified
      const totalVerifiedResult = await this.client
        .query(
          `
        SELECT count(DISTINCT credentialId) as count FROM verifications
      `
        )
        .toPromise();
      const totalVerified = parseInt(
        (totalVerifiedResult[0] as CountResult).count,
        10
      );

      // Get total revoked
      const totalRevokedResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM credentials WHERE status = 'revoked'
      `
        )
        .toPromise();
      const totalRevoked = parseInt(
        (totalRevokedResult[0] as CountResult).count,
        10
      );

      // Get active credentials
      const activeCredentials = totalIssued - totalRevoked;

      // Get by type
      const byTypeResult = await this.client
        .query(
          `
        SELECT arrayJoin(type) as credType, count(*) as count 
        FROM credentials 
        GROUP BY credType
      `
        )
        .toPromise();
      const byType: Record<string, number> = {};
      (byTypeResult as any[]).forEach((row: CredTypeResult) => {
        byType[row.credType] = parseInt(row.count, 10);
      });

      // Get by issuer
      const byIssuerResult = await this.client
        .query(
          `
        SELECT issuer, count(*) as count 
        FROM credentials 
        GROUP BY issuer
      `
        )
        .toPromise();
      const byIssuer: Record<string, number> = {};
      (byIssuerResult as any[]).forEach((row: IssuerResult) => {
        byIssuer[row.issuer] = parseInt(row.count, 10);
      });

      // Get verification success/failure
      const verificationSuccessResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM verifications WHERE success = 1
      `
        )
        .toPromise();
      const verificationSuccess = parseInt(
        (verificationSuccessResult[0] as CountResult).count,
        10
      );

      const verificationFailureResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM verifications WHERE success = 0
      `
        )
        .toPromise();
      const verificationFailure = parseInt(
        (verificationFailureResult[0] as CountResult).count,
        10
      );

      // Get average verification time
      const avgVerificationTimeResult = await this.client
        .query(
          `
        SELECT avg(verificationTime) as avgTime FROM verifications
      `
        )
        .toPromise();
      const averageVerificationTime =
        parseFloat((avgVerificationTimeResult[0] as AvgTimeResult).avgTime) ||
        0;

      return {
        totalIssued,
        totalVerified,
        totalRevoked,
        activeCredentials,
        byType,
        byIssuer,
        verificationSuccess,
        verificationFailure,
        averageVerificationTime,
      };
    } catch (error) {
      console.error('Error getting credential stats:', error);
      throw error;
    }
  }

  /**
   * Get credential statistics for a specific period
   * @param period The period to get statistics for
   * @returns Statistics for the specified period
   */
  async getCredentialStatsForPeriod(period: {
    start: string;
    end: string;
    interval: 'hour' | 'day' | 'week' | 'month' | 'year';
  }): Promise<CredentialStats> {
    try {
      const { start, end, interval } = period;

      // Get total issued in period
      const totalIssuedResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM credentials 
        WHERE issuanceDate BETWEEN '${start}' AND '${end}'
      `
        )
        .toPromise();
      const totalIssued = parseInt(
        (totalIssuedResult[0] as CountResult).count,
        10
      );

      // Get total verified in period
      const totalVerifiedResult = await this.client
        .query(
          `
        SELECT count(DISTINCT credentialId) as count FROM verifications 
        WHERE timestamp BETWEEN '${start}' AND '${end}'
      `
        )
        .toPromise();
      const totalVerified = parseInt(
        (totalVerifiedResult[0] as CountResult).count,
        10
      );

      // Get total revoked in period
      const totalRevokedResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM revocations 
        WHERE timestamp BETWEEN '${start}' AND '${end}'
      `
        )
        .toPromise();
      const totalRevoked = parseInt(
        (totalRevokedResult[0] as CountResult).count,
        10
      );

      // Get active credentials (total issued minus total revoked)
      const activeCredentials = totalIssued - totalRevoked;

      // Get by type in period
      const byTypeResult = await this.client
        .query(
          `
        SELECT arrayJoin(type) as credType, count(*) as count 
        FROM credentials 
        WHERE issuanceDate BETWEEN '${start}' AND '${end}'
        GROUP BY credType
      `
        )
        .toPromise();
      const byType: Record<string, number> = {};
      (byTypeResult as any[]).forEach((row: CredTypeResult) => {
        byType[row.credType] = parseInt(row.count, 10);
      });

      // Get by issuer in period
      const byIssuerResult = await this.client
        .query(
          `
        SELECT issuer, count(*) as count 
        FROM credentials 
        WHERE issuanceDate BETWEEN '${start}' AND '${end}'
        GROUP BY issuer
      `
        )
        .toPromise();
      const byIssuer: Record<string, number> = {};
      (byIssuerResult as any[]).forEach((row: IssuerResult) => {
        byIssuer[row.issuer] = parseInt(row.count, 10);
      });

      // Get verification success/failure in period
      const verificationSuccessResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM verifications 
        WHERE success = 1 AND timestamp BETWEEN '${start}' AND '${end}'
      `
        )
        .toPromise();
      const verificationSuccess = parseInt(
        (verificationSuccessResult[0] as CountResult).count,
        10
      );

      const verificationFailureResult = await this.client
        .query(
          `
        SELECT count(*) as count FROM verifications 
        WHERE success = 0 AND timestamp BETWEEN '${start}' AND '${end}'
      `
        )
        .toPromise();
      const verificationFailure = parseInt(
        (verificationFailureResult[0] as CountResult).count,
        10
      );

      // Get average verification time in period
      const avgVerificationTimeResult = await this.client
        .query(
          `
        SELECT avg(verificationTime) as avgTime FROM verifications 
        WHERE timestamp BETWEEN '${start}' AND '${end}'
      `
        )
        .toPromise();
      const averageVerificationTime =
        parseFloat((avgVerificationTimeResult[0] as AvgTimeResult).avgTime) ||
        0;

      return {
        totalIssued,
        totalVerified,
        totalRevoked,
        activeCredentials,
        byType,
        byIssuer,
        verificationSuccess,
        verificationFailure,
        averageVerificationTime,
      };
    } catch (error) {
      console.error('Error getting credential stats for period:', error);
      throw error;
    }
  }

  /**
   * Create an empty stats object
   * @returns An empty credential stats object
   */
  private createEmptyStats(): CredentialStats {
    return {
      totalIssued: 0,
      totalVerified: 0,
      totalRevoked: 0,
      activeCredentials: 0,
      byType: {},
      byIssuer: {},
      verificationSuccess: 0,
      verificationFailure: 0,
      averageVerificationTime: 0,
    };
  }
}
