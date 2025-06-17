import {
  generateSetupPrompt,
  generateSessionCodeText,
  generateMinimalPrompt,
  generateTechnicalPrompt,
  isValidSessionData,
  PromptConfig
} from '../../utils/promptGenerator';
import { SessionData } from '../../services/types';

// Mock session data for testing
const mockSessionData: SessionData = {
  code: 'ABCD1234',
  ttl: 600,
  expiresAt: '2025-01-17T20:00:00.000Z'
};

const mockConfig: PromptConfig = {
  relayBaseUrl: 'https://example.com',
  additionalInstructions: 'Custom instructions here',
  includeTroubleshooting: true,
  serviceName: 'Test Service'
};

describe('promptGenerator utilities', () => {
  describe('generateSetupPrompt', () => {
    beforeEach(() => {
      // Mock Date to ensure consistent test results
      jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('8:00:00 PM');
      jest.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('1/17/2025');
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('1/17/2025, 8:00:00 PM');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('generates complete setup prompt with default config', () => {
      const prompt = generateSetupPrompt(mockSessionData);
      
      expect(prompt).toContain('CODAP Plugin Assistant Setup Instructions');
      expect(prompt).toContain('Session Code: ABCD1234');
      expect(prompt).toContain('**Expires:** 8:00:00 PM on 1/17/2025 (10 minutes remaining)');
      expect(prompt).toContain('Relay URL: http://localhost:3000');
      expect(prompt).toContain('## Setup Instructions');
      expect(prompt).toContain('## What You Can Do');
      expect(prompt).toContain('## Important Notes');
      expect(prompt).toContain('## Troubleshooting');
      expect(prompt).toContain('Generated at 1/17/2025, 8:00:00 PM • Session: ABCD1234');
    });

    it('generates prompt with custom configuration', () => {
      const prompt = generateSetupPrompt(mockSessionData, mockConfig);
      
      expect(prompt).toContain('Test Service Setup Instructions');
      expect(prompt).toContain('Relay URL: https://example.com');
      expect(prompt).toContain('## Additional Instructions');
      expect(prompt).toContain('Custom instructions here');
    });

    it('excludes troubleshooting section when configured', () => {
      const configWithoutTroubleshooting: Partial<PromptConfig> = {
        includeTroubleshooting: false
      };
      
      const prompt = generateSetupPrompt(mockSessionData, configWithoutTroubleshooting);
      
      expect(prompt).not.toContain('## Troubleshooting');
      expect(prompt).not.toContain('Connection Issues:');
    });

    it('excludes additional instructions when not provided', () => {
      const configWithoutInstructions: Partial<PromptConfig> = {
        additionalInstructions: ''
      };
      
      const prompt = generateSetupPrompt(mockSessionData, configWithoutInstructions);
      
      expect(prompt).not.toContain('## Additional Instructions');
    });

    it('calculates time remaining correctly', () => {
      const sessionWith120Seconds: SessionData = {
        ...mockSessionData,
        ttl: 120
      };
      
      const prompt = generateSetupPrompt(sessionWith120Seconds);
      
      expect(prompt).toContain('(2 minutes remaining)');
    });

    it('handles fractional minutes correctly', () => {
      const sessionWith90Seconds: SessionData = {
        ...mockSessionData,
        ttl: 90
      };
      
      const prompt = generateSetupPrompt(sessionWith90Seconds);
      
      expect(prompt).toContain('(2 minutes remaining)'); // Math.ceil(90/60) = 2
    });

    it('includes session code in multiple locations', () => {
      const prompt = generateSetupPrompt(mockSessionData);
      
      // Count occurrences of session code
      const codeOccurrences = (prompt.match(/ABCD1234/g) || []).length;
      expect(codeOccurrences).toBeGreaterThan(3); // Should appear in multiple places
    });

    it('includes proper markdown formatting', () => {
      const prompt = generateSetupPrompt(mockSessionData);
      
      expect(prompt).toContain('# CODAP Plugin Assistant Setup Instructions');
      expect(prompt).toContain('## Session Details');
      expect(prompt).toContain('**Session Code:**');
      expect(prompt).toContain('```');
      expect(prompt).toContain('---');
    });
  });

  describe('generateSessionCodeText', () => {
    it('returns the session code as-is', () => {
      const result = generateSessionCodeText('TESTCODE');
      expect(result).toBe('TESTCODE');
    });

    it('handles empty string', () => {
      const result = generateSessionCodeText('');
      expect(result).toBe('');
    });

    it('preserves special characters', () => {
      const result = generateSessionCodeText('ABC-123!');
      expect(result).toBe('ABC-123!');
    });
  });

  describe('generateMinimalPrompt', () => {
    it('generates minimal prompt with default relay URL', () => {
      const prompt = generateMinimalPrompt(mockSessionData);
      
      expect(prompt).toContain('Connect to CODAP session:');
      expect(prompt).toContain('Session Code: ABCD1234');
      expect(prompt).toContain('Relay URL: http://localhost:3000');
      expect(prompt).toContain('Please establish connection and help with CODAP data analysis.');
    });

    it('generates minimal prompt with custom relay URL', () => {
      const prompt = generateMinimalPrompt(mockSessionData, 'https://custom.com');
      
      expect(prompt).toContain('Relay URL: https://custom.com');
    });

    it('is significantly shorter than full prompt', () => {
      const fullPrompt = generateSetupPrompt(mockSessionData);
      const minimalPrompt = generateMinimalPrompt(mockSessionData);
      
      expect(minimalPrompt.length).toBeLessThan(fullPrompt.length / 5);
    });
  });

  describe('generateTechnicalPrompt', () => {
    it('generates technical prompt with JSON structure', () => {
      const prompt = generateTechnicalPrompt(mockSessionData);
      
      expect(prompt).toContain('# CODAP Plugin Session Connection');
      expect(prompt).toContain('## Connection Parameters');
      expect(prompt).toContain('```json');
      expect(prompt).toContain('"sessionCode": "ABCD1234"');
      expect(prompt).toContain('"relayUrl": "http://localhost:3000"');
      expect(prompt).toContain('"ttl": 600');
      expect(prompt).toContain('"expiresAt": "2025-01-17T20:00:00.000Z"');
    });

    it('includes API endpoints section', () => {
      const prompt = generateTechnicalPrompt(mockSessionData);
      
      expect(prompt).toContain('## API Endpoints');
      expect(prompt).toContain('Session Status:** GET');
      expect(prompt).toContain('Data Operations:** POST');
      expect(prompt).toContain('Commands:** POST');
      expect(prompt).toContain('/api/sessions/ABCD1234');
    });

    it('uses custom relay URL in endpoints', () => {
      const config: Partial<PromptConfig> = {
        relayBaseUrl: 'https://api.example.com'
      };
      
      const prompt = generateTechnicalPrompt(mockSessionData, config);
      
      expect(prompt).toContain('https://api.example.com/api/sessions/ABCD1234');
    });

    it('includes usage and integration sections', () => {
      const prompt = generateTechnicalPrompt(mockSessionData);
      
      expect(prompt).toContain('## Usage');
      expect(prompt).toContain('## Integration');
      expect(prompt).toContain('Session expires in 10 minutes');
    });
  });

  describe('isValidSessionData', () => {
    it('validates correct session data', () => {
      expect(isValidSessionData(mockSessionData)).toBe(true);
    });

    it('rejects null or undefined', () => {
      expect(isValidSessionData(null)).toBe(false);
      expect(isValidSessionData(undefined)).toBe(false);
    });

    it('rejects missing code field', () => {
      const invalidData = { ...mockSessionData };
      delete (invalidData as any).code;
      expect(isValidSessionData(invalidData)).toBe(false);
    });

    it('rejects non-string code', () => {
      const invalidData = { ...mockSessionData, code: 12345 };
      expect(isValidSessionData(invalidData)).toBe(false);
    });

    it('rejects code with wrong length', () => {
      const shortCode = { ...mockSessionData, code: 'ABC123' };
      const longCode = { ...mockSessionData, code: 'ABCD12345' };
      
      expect(isValidSessionData(shortCode)).toBe(false);
      expect(isValidSessionData(longCode)).toBe(false);
    });

    it('rejects missing ttl field', () => {
      const invalidData = { ...mockSessionData };
      delete (invalidData as any).ttl;
      expect(isValidSessionData(invalidData)).toBe(false);
    });

    it('rejects non-number ttl', () => {
      const invalidData = { ...mockSessionData, ttl: '600' };
      expect(isValidSessionData(invalidData)).toBe(false);
    });

    it('rejects zero or negative ttl', () => {
      const zeroTtl = { ...mockSessionData, ttl: 0 };
      const negativeTtl = { ...mockSessionData, ttl: -100 };
      
      expect(isValidSessionData(zeroTtl)).toBe(false);
      expect(isValidSessionData(negativeTtl)).toBe(false);
    });

    it('rejects missing expiresAt field', () => {
      const invalidData = { ...mockSessionData };
      delete (invalidData as any).expiresAt;
      expect(isValidSessionData(invalidData)).toBe(false);
    });

    it('rejects non-string expiresAt', () => {
      const invalidData = { ...mockSessionData, expiresAt: new Date() };
      expect(isValidSessionData(invalidData)).toBe(false);
    });

    it('validates edge case values', () => {
      const edgeCase: SessionData = {
        code: 'A2B3C4D5', // Valid Base32-like code
        ttl: 1, // Minimum positive TTL
        expiresAt: '2025-12-31T23:59:59.999Z' // Valid ISO string
      };
      
      expect(isValidSessionData(edgeCase)).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('generates consistent prompts for same session data', () => {
      const prompt1 = generateSetupPrompt(mockSessionData, mockConfig);
      const prompt2 = generateSetupPrompt(mockSessionData, mockConfig);
      
      // Remove timestamp line for comparison
      const normalize = (p: string) => p.replace(/\*Generated at.*\*/g, '');
      
      expect(normalize(prompt1)).toBe(normalize(prompt2));
    });

    it('handles all prompt types with same session data', () => {
      const setupPrompt = generateSetupPrompt(mockSessionData);
      const minimalPrompt = generateMinimalPrompt(mockSessionData);
      const technicalPrompt = generateTechnicalPrompt(mockSessionData);
      const codeText = generateSessionCodeText(mockSessionData.code);
      
      // All should contain the session code
      expect(setupPrompt).toContain('ABCD1234');
      expect(minimalPrompt).toContain('ABCD1234');
      expect(technicalPrompt).toContain('ABCD1234');
      expect(codeText).toBe('ABCD1234');
    });

    it('handles extreme TTL values correctly', () => {
      const shortSession: SessionData = {
        ...mockSessionData,
        ttl: 30 // 30 seconds
      };
      
      const longSession: SessionData = {
        ...mockSessionData,
        ttl: 86400 // 24 hours
      };
      
      const shortPrompt = generateSetupPrompt(shortSession);
      const longPrompt = generateSetupPrompt(longSession);
      
      expect(shortPrompt).toContain('(1 minutes remaining)'); // Math.ceil(30/60)
      expect(longPrompt).toContain('(1440 minutes remaining)'); // 86400/60
    });
  });
}); 