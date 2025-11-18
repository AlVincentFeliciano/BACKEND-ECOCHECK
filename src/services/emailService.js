// backend/src/services/emailService.js
const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    try {
      // Force SendGrid if API key exists (prioritize over others)
      if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        this.useSendGrid = true;
        this.useResend = false;
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@ecocheck.app';
        console.log('✅ Email Service initialized with SendGrid');
        console.log('📧 From email:', this.fromEmail);
      } else if (process.env.RESEND_API_KEY) {
        // Using Resend API (alternative)
        this.useResend = true;
        this.useSendGrid = false;
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

  // Send report resolved notification
  async sendReportResolvedEmail(userEmail, userName, reportDetails) {
    const subject = 'Your Report Has Been Resolved - EcoCheck';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f9; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #4CAF50 0%, #2E7D32 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Report Resolved!
                    </h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${userName || 'User'}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Great news! Your environmental report has been reviewed and marked as <strong style="color: #4CAF50;">Resolved</strong>.
                    </p>
                    
                    <!-- Report Details Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #4CAF50; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px; color: #2E7D32; font-size: 18px;">Report Details</h3>
                      ${reportDetails.description ? `<p style="margin: 0 0 10px; color: #555555; font-size: 14px;"><strong>Description:</strong> ${reportDetails.description}</p>` : ''}
                      ${reportDetails.location ? `<p style="margin: 0 0 10px; color: #555555; font-size: 14px;"><strong>Location:</strong> ${reportDetails.location}</p>` : ''}
                      ${reportDetails.createdAt ? `<p style="margin: 0; color: #555555; font-size: 14px;"><strong>Reported on:</strong> ${new Date(reportDetails.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                    </div>
                    
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Thank you for helping keep our environment clean and reporting this issue. Your contribution makes a difference! 🌱
                    </p>
                    
                    <!-- Points Earned (if applicable) -->
                    <div style="background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
                      <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">
                        🎉 You've earned <span style="font-size: 24px; font-weight: 700;">+10 points</span> for this report!
                      </p>
                    </div>
                    
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                      Keep reporting environmental concerns to earn more points and help build a cleaner community.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                      EcoCheck - Environmental Monitoring System
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const textContent = `
Report Resolved!

Hello ${userName || 'User'},

Great news! Your environmental report has been reviewed and marked as Resolved.

Report Details:
${reportDetails.description ? `Description: ${reportDetails.description}` : ''}
${reportDetails.location ? `Location: ${reportDetails.location}` : ''}
${reportDetails.createdAt ? `Reported on: ${new Date(reportDetails.createdAt).toLocaleDateString()}` : ''}

You've earned +10 points for this report!

Thank you for helping keep our environment clean and reporting this issue. Your contribution makes a difference!

---
EcoCheck - Environmental Monitoring System
This is an automated notification. Please do not reply to this email.
    `;

    try {
      if (this.useSendGrid) {
        const msg = {
          to: userEmail,
          from: this.fromEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        };

        await sgMail.send(msg);
        console.log(`✅ Report resolved email sent to ${userEmail} via SendGrid`);
        return { success: true, provider: 'SendGrid' };
      } else if (this.useResend) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: this.fromEmail || 'EcoCheck <noreply@ecocheck.app>',
            to: [userEmail],
            subject: subject,
            html: htmlContent,
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Resend API error');
        }

        console.log(`✅ Report resolved email sent to ${userEmail} via Resend`);
        return { success: true, provider: 'Resend', messageId: data.id };
      } else if (this.transporter) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Report resolved email sent to ${userEmail} via SMTP`);
        return { success: true, provider: 'SMTP', messageId: info.messageId };
      } else {
        return this.developmentFallbackReportResolved(userEmail, userName, reportDetails);
      }
    } catch (error) {
      console.error('❌ Error sending report resolved email:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.body);
      }
      throw error;
    }
  }

  // Send pending confirmation notification (new two-way confirmation system)
  async sendPendingConfirmationEmail(userEmail, userName, reportDetails) {
    const subject = 'Your Report is Pending Confirmation - EcoCheck';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f9; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      ⏳ Pending Your Confirmation
                    </h1>
                  </td>
                </tr>
                
                <!-- Body -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${userName || 'User'}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px; color: #333333; font-size: 16px; line-height: 1.6;">
                      Your environmental report has been addressed by our team. We've attached a photo showing the resolution.
                    </p>
                    
                    <!-- Report Details Card -->
                    <div style="background-color: #f8f9fa; border-left: 4px solid #FF9800; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 15px; color: #F57C00; font-size: 18px;">Report Details</h3>
                      ${reportDetails.location ? `<p style="margin: 0 0 10px; color: #555555; font-size: 14px;"><strong>Location:</strong> ${reportDetails.location}</p>` : ''}
                      ${reportDetails.createdAt ? `<p style="margin: 0; color: #555555; font-size: 14px;"><strong>Reported on:</strong> ${new Date(reportDetails.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                    </div>
                    
                    ${reportDetails.resolutionPhotoUrl ? `
                    <!-- Resolution Photo -->
                    <div style="margin: 25px 0; text-align: center;">
                      <p style="margin: 0 0 10px; color: #333333; font-size: 14px; font-weight: 600;">Resolution Photo:</p>
                      <img src="${reportDetails.resolutionPhotoUrl}" alt="Resolution Photo" style="max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);" />
                    </div>
                    ` : ''}
                    
                    <!-- Action Required Box -->
                    <div style="background-color: #fff3e0; border: 2px solid #FF9800; border-radius: 8px; padding: 20px; margin: 25px 0;">
                      <h3 style="margin: 0 0 10px; color: #F57C00; font-size: 16px;">⚡ Action Required</h3>
                      <p style="margin: 0; color: #555555; font-size: 14px; line-height: 1.6;">
                        Please open the <strong>EcoCheck mobile app</strong> to confirm that the issue has been resolved, or report if it's still unresolved.
                      </p>
                      <p style="margin: 10px 0 0; color: #555555; font-size: 13px;">
                        <em>If you don't respond within 3 days, the report will be automatically marked as resolved.</em>
                      </p>
                    </div>
                    
                    <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6; text-align: center;">
                      Thank you for helping keep our environment clean! 🌱
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">
                      EcoCheck - Environmental Monitoring System
                    </p>
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      This is an automated notification. Please do not reply to this email.
                    </p>
                  </td>
                </tr>
                
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const textContent = `
Pending Your Confirmation

Hello ${userName || 'User'},

Your environmental report has been addressed by our team.

Report Details:
${reportDetails.location ? `Location: ${reportDetails.location}` : ''}
${reportDetails.createdAt ? `Reported on: ${new Date(reportDetails.createdAt).toLocaleDateString()}` : ''}

${reportDetails.resolutionPhotoUrl ? `Resolution photo has been attached.` : ''}

ACTION REQUIRED:
Please open the EcoCheck mobile app to confirm that the issue has been resolved, or report if it's still unresolved.

If you don't respond within 3 days, the report will be automatically marked as resolved.

Thank you for helping keep our environment clean!

---
EcoCheck - Environmental Monitoring System
This is an automated notification. Please do not reply to this email.
    `;

    try {
      if (this.useSendGrid) {
        const msg = {
          to: userEmail,
          from: this.fromEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        };

        await sgMail.send(msg);
        console.log(`✅ Pending confirmation email sent to ${userEmail} via SendGrid`);
        return { success: true, provider: 'SendGrid' };
      } else if (this.useResend) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: this.fromEmail || 'EcoCheck <noreply@ecocheck.app>',
            to: [userEmail],
            subject: subject,
            html: htmlContent,
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Resend API error');
        }

        console.log(`✅ Pending confirmation email sent to ${userEmail} via Resend`);
        return { success: true, provider: 'Resend', messageId: data.id };
      } else if (this.transporter) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: subject,
          text: textContent,
          html: htmlContent,
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`✅ Pending confirmation email sent to ${userEmail} via SMTP`);
        return { success: true, provider: 'SMTP', messageId: info.messageId };
      } else {
        return this.developmentFallbackPendingConfirmation(userEmail, userName, reportDetails);
      }
    } catch (error) {
      console.error('❌ Error sending pending confirmation email:', error.message);
      if (error.response) {
        console.error('Error details:', error.response.body);
      }
      throw error;
    }
  }

  developmentFallbackPendingConfirmation(userEmail, userName, reportDetails) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 DEVELOPMENT MODE - EMAIL NOT SENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 To:', userEmail);
    console.log('👤 Name:', userName);
    console.log('📋 Type: Pending Confirmation Notification');
    console.log('📍 Location:', reportDetails.location || 'N/A');
    console.log('🖼️  Resolution Photo:', reportDetails.resolutionPhotoUrl || 'N/A');
    console.log('⏰ Auto-resolve in: 3 days');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Email would be sent in production');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      success: true,
      messageId: 'DEV_PENDING_' + Date.now(),
      provider: 'development',
      note: 'Development mode - email displayed in console'
    };
  }

  developmentFallbackReportResolved(userEmail, userName, reportDetails) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔧 DEVELOPMENT MODE - EMAIL NOT SENT');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 To:', userEmail);
    console.log('👤 Name:', userName);
    console.log('📋 Type: Report Resolved Notification');
    console.log('📍 Location:', reportDetails.location || 'N/A');
    console.log('📝 Description:', reportDetails.description || 'N/A');
    console.log('🎉 Points Awarded: +10');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('💡 Email would be sent in production');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return {
      success: true,
      messageId: 'DEV_RESOLVED_' + Date.now(),
      provider: 'development',
      note: 'Development mode - email displayed in console'
    };
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