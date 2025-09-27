// backend/src/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Using Gmail SMTP (free) - you can also use other providers
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com', // Add to .env
        pass: process.env.EMAIL_PASS || 'your-app-password'     // Add to .env
      }
    });
  }

  async sendPasswordResetEmail(userEmail, resetCode) {
    try {
      console.log(`📧 Sending password reset email to ${userEmail}`);
      
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

      const result = await this.transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent successfully:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
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