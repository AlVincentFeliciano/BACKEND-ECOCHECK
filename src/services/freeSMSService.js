// backend/src/services/smsService.js
const axios = require('axios');

// Free SMS Service using TextBelt (1 SMS per day limit)
class SMSService {
  constructor() {
    // TextBelt - Free SMS service (1 message per day per IP)
    this.textbeltUrl = 'https://textbelt.com/text';
    this.textbeltKey = 'textbelt'; // Free key with 1/day limit
    this.senderName = 'EcoCheck';
  }

  async sendSMS(contactNumber, message) {
    try {
      // Format phone number for international use
      const formattedNumber = this.formatPhoneNumber(contactNumber);
      console.log(`📱 Sending FREE SMS via TextBelt to ${formattedNumber}`);

      const response = await axios.post(this.textbeltUrl, {
        phone: formattedNumber,
        message: message,
        key: this.textbeltKey
      });

      if (response.data.success) {
        console.log(`✅ SMS sent successfully via TextBelt to ${formattedNumber}`);
        console.log(`ℹ️ TextBelt quota remaining: ${response.data.quotaRemaining || 'Unknown'}`);
        return { 
          success: true, 
          messageId: response.data.textId, 
          provider: 'textbelt',
          quotaRemaining: response.data.quotaRemaining 
        };
      } else {
        const error = response.data.error || 'TextBelt SMS failed';
        
        if (error.includes('quota') || error.includes('limit')) {
          console.log('⚠️ TextBelt daily quota exceeded (1 SMS/day limit)');
          // Fall back to development mode when quota exceeded
          return this.developmentFallback(contactNumber, message);
        }
        
        throw new Error(`TextBelt error: ${error}`);
      }
      
    } catch (error) {
      console.error('❌ TextBelt SMS Error:', error.message);
      
      // Always fall back to development mode if SMS fails
      return this.developmentFallback(contactNumber, message);
    }
  }

  developmentFallback(contactNumber, message) {
    const code = message.match(/\d{6}/)?.[0] || 'N/A';
    console.log(`🔐 DEVELOPMENT FALLBACK - SMS failed, logging verification code:`);
    console.log(`📱 Contact: ${contactNumber}`);
    console.log(`🔢 Code: ${code}`);
    console.log(`💬 Full Message: ${message}`);
    console.log(`⚠️ User will need to check server logs for the verification code.`);
    
    return { 
      success: true, 
      messageId: 'dev-fallback',
      provider: 'development',
      code: code // Include code in response for development
    };
  }

  formatPhoneNumber(contactNumber) {
    // Remove any non-digit characters
    const cleaned = contactNumber.replace(/\D/g, '');
    
    // Handle different Philippine phone number formats for international use
    if (cleaned.startsWith('09')) {
      // Convert 09XXXXXXXXX to +639XXXXXXXXX
      return `+63${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('639')) {
      // Already in 639 format, just add +
      return `+${cleaned}`;
    } else if (cleaned.startsWith('9') && cleaned.length === 10) {
      // 9XXXXXXXXX format, add +63
      return `+63${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // 0XXXXXXXXXX format, convert to +63
      return `+63${cleaned.substring(1)}`;
    } else {
      // For other formats, try to make it work
      return cleaned.startsWith('+') ? cleaned : `+63${cleaned}`;
    }
  }
}

module.exports = SMSService;