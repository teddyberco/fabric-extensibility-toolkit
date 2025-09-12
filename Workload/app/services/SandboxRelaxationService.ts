/**
 * Sandbox Relaxation Service for Microsoft Fabric
 * Handles official sandbox relaxation scopes according to Fabric's security model
 */

export interface FabricSandboxRelaxationScopes {
  'Fabric.Extend'?: boolean;
  'DOWNLOAD'?: boolean;
  'POP-UP'?: boolean;
  'FORMS'?: boolean;
}

export class SandboxRelaxationService {
  private static instance: SandboxRelaxationService;
  private grantedScopes: FabricSandboxRelaxationScopes = {};

  public static getInstance(): SandboxRelaxationService {
    if (!SandboxRelaxationService.instance) {
      SandboxRelaxationService.instance = new SandboxRelaxationService();
    }
    return SandboxRelaxationService.instance;
  }

  /**
   * Request consent for specific sandbox relaxation scopes
   * In a real implementation, this would integrate with Fabric's official consent system
   */
  public async requestConsent(requiredScopes: (keyof FabricSandboxRelaxationScopes)[]): Promise<boolean> {
    try {
      // Simulate consent process
      // In production, this would call the official Fabric consent API
      
      // For demo purposes, always grant consent
      for (const scope of requiredScopes) {
        this.grantedScopes[scope] = true;
      }

      console.log('Sandbox consent granted for scopes:', requiredScopes);
      return true;
    } catch (error) {
      console.error('Failed to request sandbox consent:', error);
      return false;
    }
  }

  /**
   * Check if a specific scope has been granted
   */
  public hasScope(scope: keyof FabricSandboxRelaxationScopes): boolean {
    return this.grantedScopes[scope] === true;
  }

  /**
   * Get all currently granted scopes
   */
  public getGrantedScopes(): FabricSandboxRelaxationScopes {
    return { ...this.grantedScopes };
  }

  /**
   * Revoke a specific scope
   */
  public revokeScope(scope: keyof FabricSandboxRelaxationScopes): void {
    delete this.grantedScopes[scope];
  }

  /**
   * Clear all granted scopes
   */
  public clearAllScopes(): void {
    this.grantedScopes = {};
  }
}