const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'Adile Bakery <onboarding@resend.dev>';

let resendClient = null;
const getResendClient = () => {
  if (!resendClient) {
    resendClient = new Resend(RESEND_API_KEY);
  }
  return resendClient;
};

const sendOTPEmail = async (email, otp) => {
  console.log('[FORGOT_TRACE] sendOTPEmail entered');

  if (!EMAIL_USER || !EMAIL_PASS) {
    console.log('-----------------------------------------');
    console.log(`[EMAIL CONSOLE] To: ${email}`);
    console.log(`[OTP] Your password reset code is: ${otp}`);
    console.log('This code will expire in 5 minutes.');
    console.log('-----------------------------------------');
    throw new Error('RESEND_API_KEY must be configured');
  }

  console.log('[RESEND DEBUG] API key exists:', !!process.env.RESEND_API_KEY);
  console.log('[RESEND DEBUG] FROM:', process.env.RESEND_FROM);

  const resend = getResendClient();

  const mailOptions = {
    from: RESEND_FROM,
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

  console.log('[RESEND] sending email to', email);

  console.log(
    '[OTP_DIAG] sendMail: about to call via Resend HTTP API to=',
    email,
    'from=',
    RESEND_FROM
  );

  const sendStart = Date.now();

  try {
    console.log('[RESEND DEBUG] sending to:', email);
    console.log('[RESEND DEBUG] subject:', 'Your Password Reset Code');

    const response = await resend.emails.send(mailOptions);

    console.log('[RESEND DEBUG] raw response:', JSON.stringify(response, null, 2));

    if (response.data) {
      console.log('[RESEND DEBUG] response.data:', JSON.stringify(response.data, null, 2));
    }
    if (response.data && response.data.id) {
      console.log('[RESEND DEBUG] response.data.id:', response.data.id);
    }
    if (response.error) {
      console.log('[RESEND DEBUG] response.error:', JSON.stringify(response.error, null, 2));
    }

    const { data, error } = response;

    if (error) {
      const err = new Error(error.message || 'Resend send failed');
      err.code = error.name || 'RESEND_ERROR';
      throw err;
    }

    console.log(
      '[OTP_DIAG] sendMail: completed in',
      Date.now() - sendStart,
      'ms, messageId=',
      data && data.id
    );
  } catch (err) {
    console.error(
      '[OTP_DIAG] sendMail: failed after',
      Date.now() - sendStart,
      'ms, code=',
      err.code,
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
