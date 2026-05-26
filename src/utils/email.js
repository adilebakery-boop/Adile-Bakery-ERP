const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const sendOTPEmail = async (email, otp) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('-----------------------------------------');
    console.log(`[EMAIL CONSOLE] To: ${email}`);
    console.log(`[OTP] Your password reset code is: ${otp}`);
    console.log('This code will expire in 5 minutes.');
    console.log('-----------------------------------------');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: `"Adile Bakery ERP" <${EMAIL_USER}>`,
    to: email,
    subject: 'Your Password Reset Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background-color: #F9F7F2; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 64px; height: 64px; background-color: #001F3F; border-radius: 16px; line-height: 64px; font-size: 32px;">🥐</div>
          <h2 style="color: #001F3F; margin: 16px 0 4px;">Adile Bakery</h2>
          <p style="color: #666; margin: 0; font-size: 14px;">Password Reset Code</p>
        </div>
        <div style="background-color: #fff; padding: 24px; border-radius: 12px; text-align: center;">
          <p style="color: #333; font-size: 14px; margin: 0 0 16px;">Use the code below to reset your password.</p>
          <div style="background-color: #F9F7F2; padding: 16px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #001F3F; font-family: monospace;">${otp}</div>
          <p style="color: #999; font-size: 12px; margin: 16px 0 0;">This code expires in 5 minutes.</p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendOTPEmail
};
