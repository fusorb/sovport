import type { IdentitySdk } from "@fusorb/facet-sdk";

declare module "@fusorb/facet-sdk" {
  interface IdentitySdk {
    registerPairedDevice?(body: {
      deviceId: string;
      publicKey: string;
      name?: string;
      platform?: string;
    }): Promise<{ id: string; deviceId: string }>;
    listPairedDevices?(): Promise<any[]>;
    revokePairedDevice?(deviceId: string): Promise<{ revoked: boolean }>;
  }
}
