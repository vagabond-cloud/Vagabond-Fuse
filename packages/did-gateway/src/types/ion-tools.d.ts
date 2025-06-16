declare module '@decentralized-identity/ion-tools' {
  export interface AnchorRequest {
    didDocument: any;
    operation: {
      type: string;
    };
    didResolutionMetadata?: {
      contentType?: string;
    };
    mockRequest?: boolean;
    mockDeactivateRequest?: boolean;
  }

  export interface AnchorResponse {
    status: string;
    didDocument: any;
    anchorFileHash: string;
  }

  export interface ResolutionResponse {
    didDocument: any;
    status: string;
  }

  export const AnchorRequest: {
    createCreate: (document: any, privateKey: string) => Promise<AnchorRequest>;
    createUpdate: (document: any, privateKey: string) => Promise<AnchorRequest>;
    createDeactivate: (
      did: string,
      privateKey: string
    ) => Promise<AnchorRequest>;
  };

  export const KeyPair: {
    create: (type: string) => Promise<any>;
    fromJwk: (jwk: any) => Promise<any>;
  };

  export class DID {
    static from(did: string): Promise<DID>;
    constructor(options: any);
    getDocument(): any;
    generateOperation(type: string, options: any): Promise<any>;
    generateRequest(keys: any): Promise<AnchorRequest>;
    generateDeactivateRequest(keys: any): Promise<AnchorRequest>;
    setContent(document: any): void;
  }

  export function anchor(request: AnchorRequest): Promise<AnchorResponse>;
  export function resolve(did: string): Promise<ResolutionResponse>;
}
