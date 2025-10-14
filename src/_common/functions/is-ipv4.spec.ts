import { isIPv4 } from '~/_common/functions/is-ipv4';

describe('isIPv4', () => {
  describe('Valid IPv4 addresses', () => {
    it('should accept standard IPv4 addresses', () => {
      const validAddresses = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.254.1',
        '127.0.0.1',
        '8.8.8.8',
        '1.1.1.1'
      ];

      validAddresses.forEach(address => {
        expect(isIPv4(address)).toBe(true);
      });
    });

    it('should accept edge case valid addresses', () => {
      const edgeCases = [
        '0.0.0.0',           // Network address
        '255.255.255.255',   // Broadcast address
        '255.0.0.0',         // Class A network mask
        '255.255.0.0',       // Class B network mask
        '255.255.255.0',     // Class C network mask
        '192.168.0.1',       // Private network
        '10.255.255.254',    // Private network edge
        '172.31.255.255'     // Private network edge
      ];

      edgeCases.forEach(address => {
        expect(isIPv4(address)).toBe(true);
      });
    });

    it('should accept addresses with leading zeros (current regex behavior)', () => {
      const leadingZeroAddresses = [
        '192.168.001.001',
        '010.000.000.001',
        '001.002.003.004',
        '000.000.000.000'
      ];

      leadingZeroAddresses.forEach(address => {
        expect(isIPv4(address)).toBe(true);
      });
    });
  });

  describe('Invalid IPv4 addresses', () => {
    it('should reject addresses with octets > 255', () => {
      const invalidAddresses = [
        '256.1.1.1',
        '192.256.1.1',
        '192.168.256.1',
        '192.168.1.256',
        '300.168.1.1',
        '192.300.1.1',
        '999.999.999.999'
      ];

      invalidAddresses.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });

    it('should reject addresses with wrong number of octets', () => {
      const wrongOctetCount = [
        '192.168.1',         // Too few
        '192.168',           // Too few
        '192',               // Too few
        '192.168.1.1.1',     // Too many
        '192.168.1.1.1.1',   // Too many
        '1.2.3.4.5.6.7.8'    // Way too many
      ];

      wrongOctetCount.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });

    it('should reject addresses with negative numbers', () => {
      const negativeNumbers = [
        '-1.168.1.1',
        '192.-1.1.1',
        '192.168.-1.1',
        '192.168.1.-1',
        '-192.168.1.1'
      ];

      negativeNumbers.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });

    it('should reject addresses with non-numeric characters', () => {
      const nonNumeric = [
        'a.b.c.d',
        '192.168.a.1',
        '192.168.1.a',
        '192.168.1.1a',
        'localhost',
        '192.168.1.1/24',
        '192.168.1.1:80',
        '192.168.1.1 ',
        ' 192.168.1.1'
      ];

      nonNumeric.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });

    it('should reject empty and malformed strings', () => {
      const malformed = [
        '',
        ' ',
        '...',
        '192..1.1',
        '192.168..1',
        '192.168.1.',
        '.192.168.1.1',
        '192.168.1.1.',
        '192,168,1,1',
        '192 168 1 1'
      ];

      malformed.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });

    it('should reject IPv6 addresses', () => {
      const ipv6Addresses = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
        '2001:db8:85a3::8a2e:370:7334',
        '::1',
        '::',
        'fe80::1'
      ];

      ipv6Addresses.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });
  });

  describe('RFC compliance edge cases', () => {
    it('should handle boundary values correctly', () => {
      // Test exact boundary values
      expect(isIPv4('0.0.0.0')).toBe(true);
      expect(isIPv4('255.255.255.255')).toBe(true);

      // Test just over boundary
      expect(isIPv4('256.0.0.0')).toBe(false);
      expect(isIPv4('0.256.0.0')).toBe(false);
      expect(isIPv4('0.0.256.0')).toBe(false);
      expect(isIPv4('0.0.0.256')).toBe(false);
    });

    it('should handle various number formats', () => {
      // Single digits
      expect(isIPv4('1.2.3.4')).toBe(true);

      // Double digits
      expect(isIPv4('12.34.56.78')).toBe(true);

      // Triple digits
      expect(isIPv4('123.234.200.199')).toBe(true);

      // Mixed lengths
      expect(isIPv4('1.22.333.4')).toBe(false); // 333 > 255
      expect(isIPv4('1.22.200.4')).toBe(true);
    });
  });

  describe('Performance and edge case testing', () => {
    it('should handle very long strings efficiently', () => {
      const longString = '1'.repeat(1000) + '.1.1.1';
      expect(isIPv4(longString)).toBe(false);
    });

    it('should handle special characters', () => {
      const specialChars = [
        '192.168.1.1\n',
        '192.168.1.1\t',
        '192.168.1.1\r',
        '192.168.1.1\0'
      ];

      specialChars.forEach(address => {
        expect(isIPv4(address)).toBe(false);
      });
    });
  });
});
