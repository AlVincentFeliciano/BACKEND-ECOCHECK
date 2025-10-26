// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    try {
      // Check if we should use SendGrid (recommended)
      if (process.env.SENDGRID_API_KEY) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.useSendGrid = true;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@ecocheck.app';
        console.log('✅ Email Service initialized with SendGrid');
      } else if (process.env.RESEND_API_KEY) {
        // Using Resend API (alternative)
        this.useResend = true;
        console.log('✅ Email Service initialized with Resend API');
      } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        // Fallback to Gmail SMTP
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          },
          tls: {
            rejectUnauthorized: false
          }
        });
        console.log('✅ Email Service initialized with Gmail SMTP');
        this.testConnection();
      } else {
        // No email credentials configured - use development mode
        console.log('⚠️ No email credentials configured - running in DEVELOPMENT MODE');
        console.log('💡 To enable email sending:');
        console.log('   Option 1 (Recommended): Add SENDGRID_API_KEY to .env');
        console.log('   Option 2: Add RESEND_API_KEY to .env');
        console.log('   Option 3: Add EMAIL_USER and EMAIL_PASS to .env for Gmail');
        this.transporter = null;
        this.useSendGrid = false;
        this.useResend = false;
        this.developmentMode = true;
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Email Service:', error.message);
      this.transporter = null;
      this.useSendGrid = false;
      this.useResend = false;
      this.developmentMode = true;
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

  async sendPasswordResetWithSendGrid(userEmail, resetCode) {
    try {
      const msg = {
        to: userEmail,
        from: this.fromEmail,
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
      };

      const response = await sgMail.send(msg);
      console.log('✅ Password reset email sent via SendGrid');
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid'
      };
    } catch (error) {
      console.error('❌ SendGrid email failed:', error.message);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return { success: false, error: error.message };
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
      console.log(`📧 Sending password reset email to ${userEmail}`);
      
      // If in development mode, skip email attempts and go straight to fallback
      if (this.developmentMode) {
        console.log('🔧 Development mode active - displaying code instead of sending email');
        return this.developmentFallback(userEmail, resetCode);
      }
      
      // Try SendGrid first if available
      if (this.useSendGrid) {
        const result = await this.sendPasswordResetWithSendGrid(userEmail, resetCode);
        if (result.success) {
          return result;
        }
        console.log('🔄 SendGrid failed, trying fallback...');
      }
      
      // Try Resend if available (more reliable)
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
      console.error('❌ Email sending failed:', error.message);
      return this.developmentFallback(userEmail, resetCode);
    }
  }

  // Fallback for development or when email fails
  developmentFallback(userEmail, resetCode) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 DEVELOPMENT MODE - EMAIL NOT SENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 To:', userEmail);
    console.log('🔢 Password Reset Code:', resetCode);
    console.log('⏰ Expires in: 10 minutes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Use this code to reset the password');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      success: true,
      messageId: 'DEV_' + Date.now(),
      provider: 'development',
      code: resetCode,
      note: 'Development mode - code displayed in console'
    };
  }

  async sendVerificationEmail(userEmail, verificationCode, userName) {
    try {
      console.log(`📧 Sending verification email to ${userEmail}`);
      
      // If in development mode, skip email attempts and go straight to fallback
      if (this.developmentMode) {
        console.log('🔧 Development mode active - displaying code instead of sending email');
        return this.developmentFallbackVerification(userEmail, verificationCode);
      }
      
      // Try SendGrid first if available
      if (this.useSendGrid) {
        const result = await this.sendVerificationWithSendGrid(userEmail, verificationCode, userName);
        if (result.success) {
          return result;
        }
        console.log('🔄 SendGrid failed, trying fallback...');
      }
      
      // Try Resend if available
      if (this.useResend) {
        const result = await this.sendVerificationWithResend(userEmail, verificationCode, userName);
        if (result.success) {
          return result;
        }
        console.log('🔄 Resend failed, trying Gmail SMTP...');
      }
      
      // Gmail SMTP method
      if (!this.transporter) {
        throw new Error('Email service not initialized - check credentials');
      }
      
      const mailOptions = {
        from: process.env.EMAIL_USER || 'ecocheck@gmail.com',
        to: userEmail,
        subject: 'EcoCheck - Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🌱 Welcome to EcoCheck!</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2>Hi ${userName},</h2>
              <p>Thank you for registering with EcoCheck! To complete your registration, please verify your email address.</p>
              <div style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px dashed #4CAF50;">
                <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${verificationCode}</h1>
                <p style="color: #666; margin: 5px 0;">Enter this code in the app</p>
              </div>
              <p><strong>This code expires in 15 minutes.</strong></p>
              <p>If you didn't create an EcoCheck account, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from EcoCheck. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      const emailPromise = this.transporter.sendMail(mailOptions);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gmail SMTP timeout after 10 seconds')), 10000)
      );

      const result = await Promise.race([emailPromise, timeoutPromise]);
      console.log('✅ Verification email sent via Gmail:', result.messageId);
      
      return {
        success: true,
        messageId: result.messageId
      };
      
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      return this.developmentFallbackVerification(userEmail, verificationCode);
    }
  }

  async sendVerificationWithSendGrid(userEmail, verificationCode, userName) {
    try {
      const msg = {
        to: userEmail,
        from: this.fromEmail,
        subject: 'EcoCheck - Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1>🌱 Welcome to EcoCheck!</h1>
            </div>
            <div style="padding: 20px; background-color: #f9f9f9;">
              <h2>Hi ${userName || 'there'},</h2>
              <p>Thank you for registering with EcoCheck! To complete your registration, please verify your email address.</p>
              <div style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px dashed #4CAF50;">
                <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${verificationCode}</h1>
                <p style="color: #666; margin: 5px 0;">Enter this code in the app</p>
              </div>
              <p><strong>This code expires in 15 minutes.</strong></p>
              <p>If you didn't create an EcoCheck account, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">
                This is an automated email from EcoCheck. Please do not reply to this email.
              </p>
            </div>
          </div>
        `
      };

      const response = await sgMail.send(msg);
      console.log('✅ Verification email sent via SendGrid');
      
      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
        provider: 'sendgrid'
      };
    } catch (error) {
      console.error('❌ SendGrid email failed:', error.message);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      return { success: false, error: error.message };
    }
  }

  async sendVerificationWithResend(userEmail, verificationCode, userName) {
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
          subject: 'EcoCheck - Verify Your Email Address',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                <h1>🌱 Welcome to EcoCheck!</h1>
              </div>
              <div style="padding: 20px; background-color: #f9f9f9;">
                <h2>Hi ${userName},</h2>
                <p>Thank you for registering with EcoCheck! To complete your registration, please verify your email address.</p>
                <div style="background-color: #ffffff; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center; border: 2px dashed #4CAF50;">
                  <h1 style="color: #4CAF50; font-size: 32px; margin: 0;">${verificationCode}</h1>
                  <p style="color: #666; margin: 5px 0;">Enter this code in the app</p>
                </div>
                <p><strong>This code expires in 15 minutes.</strong></p>
                <p>If you didn't create an EcoCheck account, please ignore this email.</p>
              </div>
            </div>
          `
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Verification email sent via Resend:', data.id);
        return { success: true, messageId: data.id };
      } else {
        throw new Error(`Resend API error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Resend email failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  developmentFallbackVerification(userEmail, verificationCode) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 DEVELOPMENT MODE - EMAIL NOT SENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 To:', userEmail);
    console.log('🔢 Verification Code:', verificationCode);
    console.log('⏰ Expires in: 15 minutes');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Use this code to verify the account');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      success: true,
      messageId: 'DEV_VERIFY_' + Date.now(),
      provider: 'development',
      code: verificationCode,
      note: 'Development mode - code displayed in console'
    };
  }
}

module.exports = EmailService;