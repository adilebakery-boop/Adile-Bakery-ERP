const nodemailer = require('nodemailer');
const dns = require('dns').promises;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

const GMAIL_SMTP_HOST = 'smtp.gmail.com';
const CACHE_TTL_MS = 5 * 60 * 1000;

let cachedIpv4 = null;
let cacheExpiry = 0;

const getGmailIpv4 = async () => {
  if (cachedIpv4 && Date.now() < cacheExpiry) return cachedIpv4;
  const addresses = await dns.resolve4(GMAIL_SMTP_HOST);
  if (!addresses || addresses.length === 0) {
    throw new Error('No IPv4 address could be resolved for smtp.gmail.com');
  }
  cachedIpv4 = addresses[0];
  cacheExpiry = Date.now() + CACHE_TTL_MS;
  console.log('[OTP_DIAG] resolved', GMAIL_SMTP_HOST, 'to IPv4', cachedIpv4);
  return cachedIpv4;
};

const sendOTPEmail = async (email, otp) => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('-----------------------------------------');
    console.log(`[EMAIL CONSOLE] To: ${email}`);
    console.log(`[OTP] Your password reset code is: ${otp}`);
    console.log('This code will expire in 5 minutes.');
    console.log('-----------------------------------------');
    throw new Error('EMAIL_USER and EMAIL_PASS must be configured');
  }

  const ipv4Host = await getGmailIpv4();

  const transporter = nodemailer.createTransport({
    host: ipv4Host,
    port: 587,
    secure: false,
    requireTLS: true,
    servername: GMAIL_SMTP_HOST,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
    tls: { minVersion: 'TLSv1.2' },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
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

  console.log(
    '[OTP_DIAG] sendMail: about to call with host=smtp.gmail.com port=465 secure=true'
  );

  const smtpStart = Date.now();

  try {
    const info = await transporter.sendMail(mailOptions);

    console.log(
      '[OTP_DIAG] sendMail: completed in',
      Date.now() - smtpStart,
      'ms, messageId=',
      info.messageId
    );
  } catch (err) {
    console.error(
      '[OTP_DIAG] sendMail: failed after',
      Date.now() - smtpStart,
      'ms, code=',
      err.code,
      ', command=',
      err.command,
      ', responseCode=',
      err.responseCode,
      ', response=',
      err.response,
      ', message=',
      err.message
    );

    console.error(
      '[OTP_DIAG] sendMail: stack=',
      err.stack
    );

    throw err;
  }
};

module.exports = {
  sendOTPEmail
};
