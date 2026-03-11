// Test SendGrid email sending
require('dotenv').config();
const EmailService = require('./src/services/emailService');

async function testSendGrid() {
  console.log('🧪 Testing SendGrid Email Service...\n');
  
  const emailService = new EmailService();
  
  // Generate a test 6-digit code
  const testCode = Math.floor(100000 + Math.random() * 900000);
  
  // Replace with your actual email for testing
  const testEmail = 'ecocheckapp@gmail.com'; // Change this to your email
  
  console.log(`📧 Sending test verification email to: ${testEmail}`);
  console.log(`🔢 Verification code: ${testCode}\n`);
  
  try {
    const result = await emailService.sendVerificationEmail(
      testEmail,
      testCode,
      'Test User'
    );
    
    if (result.success) {
      console.log('\n✅ SUCCESS! Email sent successfully');
      console.log('📬 Check your inbox for the verification code');
      console.log('Message ID:', result.messageId);
      console.log('Provider:', result.provider || 'sendgrid');
    } else {
      console.log('\n❌ FAILED to send email');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  }
}

// Run the test
testSendGrid();
