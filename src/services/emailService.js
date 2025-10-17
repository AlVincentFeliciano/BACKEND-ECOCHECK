// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    try {
      // Check if we should use Resend (more reliable) or Gmail
      if (process.env.RESEND_API_KEY) {
        // Using Resend API (recommended for production)
        this.useResend = true;
        console.log('✅ Email Service initialized with Resend API');
      } else {
        // Fallback to Gmail SMTP
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER || 'your-email@gmail.com',
            pass: process.env.EMAIL_PASS || 'your-app-password'
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log('✅ Email Service initialized with Gmail SMTP');
        this.testConnection();
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Email Service:', error.message);
      this.transporter = null;
      this.useResend = false;
    }
  }
  
  async testConnection() {
    if (!this.transporter || this.useResend) return;
    
    try {
      await this.transporter.verify();
      console.log('✅ Gmail SMTP connection verified successfully');
    } catch (error) {
      console.error('❌ Gmail SMTP verification failed:', error.message);
      console.log('🔧 Consider switching to Resend for better reliability');
    }
  }

  async sendWithResend(userEmail, resetCode) {
    const fetch = require('node-fetch');
    
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'EcoCheck <noreply@ecocheck.app>',
          to: [userEmail],
          subject: 'EcoCheck - Password Reset Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                <h1>🌱 EcoCheck Password Reset</h1>
              </div>
              <div style="padding: 20px; background-color: #f9f9f9;">
                <h2>Password Reset Verification Code</h2>
                <p>You requested to reset your password for your EcoCheck account.</p>
                <div style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px dashed #4CAF50;">
                  <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${resetCode}</h1>
                  <p style="color: #666; margin: 5px 0;">Enter this code in the app</p>
                </div>
                <p><strong>This code expires in 10 minutes.</strong></p>
                <p>If you didn't request this password reset, please ignore this email.</p>
              </div>
            </div>
          `
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Password reset email sent via Resend:', data.id);
        return { success: true, messageId: data.id };
      } else {
        throw new Error(`Resend API error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Resend email failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendPasswordResetEmail(userEmail, resetCode) {
    try {
      console.log(`📧 Attempting to send password reset email to ${userEmail}`);
      
      // Try Resend first if available (more reliable)
      if (this.useResend) {
        const result = await this.sendWithResend(userEmail, resetCode);
        if (result.success) {
          return result;
        }
        // If Resend fails, fallback to Gmail
        console.log('🔄 Resend failed, trying Gmail SMTP...');
      }
      
      // Gmail SMTP method
      if (!this.transporter) {
        throw new Error('Email service not initialized - check credentials');
      }
      
      const mailOptions = {
        from: process.env.EMAIL_USER || 'ecocheck@gmail.com',
        to: userEmail,
        subject: 'EcoCheck - Password Reset Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🌱 EcoCheck Password Reset</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2>Password Reset Verification Code</h2>
              <p>You requested to reset your password for your EcoCheck account.</p>
              <div style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px dashed #4CAF50;">
                <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${resetCode}</h1>
                <p style="color: #666; margin: 5px 0;">Enter this code in the app</p>
              </div>
              <p><strong>This code expires in 10 minutes.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from EcoCheck. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      // Gmail with timeout
      const emailPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gmail SMTP timeout after 10 seconds')), 10000)
      );

      const result = await Promise.race([emailPromise, timeoutPromise]);
      console.log('✅ Password reset email sent via Gmail:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ All email methods failed:', error.message);
      return this.developmentFallback(userEmail, resetCode);
    }
  }

  // Fallback for development or when email fails
  developmentFallback(userEmail, resetCode) {
    console.log('🔧 EMAIL DEVELOPMENT MODE - No actual email sent');
    console.log(`📧 To: ${userEmail}`);
    console.log(`🔢 Reset Code: ${resetCode}`);
    console.log('ℹ️ In production, this would send via email');
    
    return {
      success: true,
      messageId: 'DEV_' + Date.now(),
      provider: 'development',
      code: resetCode,
      note: 'Development mode - no email actually sent'
    };
  }
}

module.exports = EmailService;