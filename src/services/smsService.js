// backend/src/services/smsService.js
const axios = require('axios');

// SMS Service with multiple provider support
class SMSService {
  constructor() {
    // Primary service (Semaphore)
    this.semaphoreApiKey = process.env.SEMAPHORE_API_KEY;
    this.semaphoreUrl = 'https://semaphore.co/api/v4/messages';
    
    // Free alternative (TextBelt) - 1 SMS per day
    this.textbeltUrl = 'https://textbelt.com/text';
    this.textbeltKey = process.env.TEXTBELT_API_KEY || 'textbelt'; // 'textbelt' is free key with 1/day limit
    
    this.senderName = process.env.SMS_SENDER_NAME || 'EcoCheck';
    this.provider = process.env.SMS_PROVIDER || 'auto'; // 'semaphore', 'textbelt', or 'auto'
  }

  async sendSMS(contactNumber, message) {
    try {
      // Auto-select provider based on availability
      if (this.provider === 'auto') {
        if (this.semaphoreApiKey && this.semaphoreApiKey !== 'your_semaphore_api_key_here') {
          return await this.sendViaSemaphore(contactNumber, message);
        } else {
          console.log('⚠️ Semaphore not configured, falling back to TextBelt (free, 1/day limit)');
          return await this.sendViaTextBelt(contactNumber, message);
        }
      } else if (this.provider === 'semaphore') {
        return await this.sendViaSemaphore(contactNumber, message);
      } else if (this.provider === 'textbelt') {
        return await this.sendViaTextBelt(contactNumber, message);
      }
      
    } catch (error) {
      console.error('❌ SMS Service Error:', error.message);
      
      // Development fallback - log the code
      if (process.env.NODE_ENV === 'development') {
        const code = message.match(/\d{6}/)?.[0] || 'N/A';
        console.log(`🔐 DEVELOPMENT FALLBACK - Verification code for ${contactNumber}: ${code}`);
        return { success: true, messageId: 'dev-fallback' };
      }
      
      throw error;
    }
  }

  async sendViaSemaphore(contactNumber, message) {
    if (!this.semaphoreApiKey || this.semaphoreApiKey === 'your_semaphore_api_key_here') {
      throw new Error('Semaphore API key not configured');
    }

    const formattedNumber = this.formatPhoneNumber(contactNumber);
    console.log(`📱 Sending SMS via Semaphore to ${formattedNumber}`);

    const response = await axios.post(this.semaphoreUrl, {
      apikey: this.semaphoreApiKey,
      number: formattedNumber,
      message: message,
      sendername: this.senderName
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      if (result.status === 'Queued' || result.status === 'Sent') {
        console.log(`✅ SMS sent successfully via Semaphore to ${formattedNumber}`);
        return { success: true, messageId: result.message_id, provider: 'semaphore' };
      } else {
        throw new Error(`Semaphore SMS failed: ${result.message}`);
      }
    } else {
      throw new Error('Invalid Semaphore response');
    }
  }

  async sendViaTextBelt(contactNumber, message) {
    // TextBelt works with international numbers
    const formattedNumber = this.formatPhoneNumber(contactNumber);
    console.log(`� Sending SMS via TextBelt (FREE - 1/day limit) to ${formattedNumber}`);

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
      if (error.includes('quota')) {
        console.log('⚠️ TextBelt daily quota exceeded (1 SMS/day limit)');
      }
      throw new Error(`TextBelt error: ${error}`);
    }
  }

  formatPhoneNumber(contactNumber) {
    // Remove any non-digit characters
    const cleaned = contactNumber.replace(/\D/g, '');
    
    // Handle different Philippine phone number formats
    if (cleaned.startsWith('09')) {
      // Convert 09XXXXXXXXX to +639XXXXXXXXX
      return `+63${cleaned.substring(1)}`;
    } else if (cleaned.startsWith('639')) {
      // Already in +639 format, just add +
      return `+${cleaned}`;
    } else if (cleaned.startsWith('9') && cleaned.length === 10) {
      // 9XXXXXXXXX format, add +63
      return `+63${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      // 0XXXXXXXXXX format, convert to +63
      return `+63${cleaned.substring(1)}`;
    } else {
      // Return as is if format is unclear
      return cleaned;
    }
  }

  // Alternative service configuration for other providers
  static createTwilioService() {
    // For future Twilio integration
    return new TwilioSMSService();
  }
}

// Alternative Twilio implementation (commented out for now)
/*
class TwilioSMSService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER;
    
    if (this.accountSid && this.authToken) {
      const twilio = require('twilio');
      this.client = twilio(this.accountSid, this.authToken);
    }
  }

  async sendSMS(contactNumber, message) {
    if (!this.client) {
      throw new Error('Twilio not configured');
    }

    const formatted = contactNumber.startsWith('+63') 
      ? contactNumber 
      : `+63${contactNumber.replace(/^0/, '')}`;

    const result = await this.client.messages.create({
      body: message,
      from: this.fromNumber,
      to: formatted
    });

    return { success: true, messageId: result.sid };
  }
}
*/

module.exports = SMSService;