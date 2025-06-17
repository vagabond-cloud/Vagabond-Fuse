declare module 'snarkjs' {
  interface Proof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  }

  interface FullProveResult {
    proof: Proof;
    publicSignals: string[];
  }

  namespace groth16 {
    function fullProve(input: any, wasmFile: string, zkeyFile: string): Promise<FullProveResult>;
    function verify(verificationKey: any, publicSignals: string[], proof: any): Promise<boolean>;
  }
} 