require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = async () => {
    console.log('--- Email Configuration Test ---');
    console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
    console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '********' : 'NOT SET');
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('ERROR: Email credentials are missing in .env file!');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: 'cdmi.project@gmail.com', // Recipient from requirements
        subject: 'Workbook App - Email Configuration Test',
        text: 'This is a test email to verify that your Workbook Application can send emails successfully. If you received this, your configuration is correct!'
    };

    try {
        console.log('Attempting to send test email...');
        await transporter.sendMail(mailOptions);
        console.log('✅ SUCCESS! Email sent successfully.');
        console.log('Please check cdmi.project@gmail.com for the test email.');
    } catch (error) {
        console.error('❌ FAILED to send email.');
        console.error('Error details:', error.message);
        console.log('\n--- Troubleshooting Tips ---');
        console.log('1. Ensure you are using a Gmail "App Password", not your regular password.');
        console.log('2. Make sure 2-Step Verification is enabled on your Google Account.');
        console.log('3. Check if your internet connection allows SMTP traffic.');
    }
};

testEmail();
