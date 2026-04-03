import crypto from 'crypto';

export const generateOtp = (length = 6) => {
    const digits = "0123456789";
    let otp = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = crypto.randomInt(0, digits.length);
        otp += digits[randomIndex];
    }

    return otp;
};


export const getOtpHtml = (otp, userName = "User") => {
  return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>OTP Verification</title>
        </head>

        <body style="margin:0;padding:0;font-family:Arial, sans-serif;background:#f4f6f8;">
            
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px;">
            <tr>
                <td align="center">
                
                <table width="100%" max-width="500px" style="background:#ffffff;border-radius:12px;padding:30px;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                    
                    <!-- Header -->
                    <tr>
                    <td align="center" style="padding-bottom:20px;">
                        <h2 style="margin:0;color:#333;">🔐 OTP Verification</h2>
                    </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                    <td style="color:#555;font-size:16px;padding-bottom:10px;">
                        Hello <strong>${userName}</strong>,
                    </td>
                    </tr>

                    <!-- Message -->
                    <tr>
                    <td style="color:#555;font-size:15px;line-height:1.6;">
                        Your One-Time Password (OTP) is:
                    </td>
                    </tr>

                    <!-- OTP Box -->
                    <tr>
                    <td align="center" style="padding:20px 0;">
                        <div style="
                        display:inline-block;
                        background:#0f2027;
                        color:#fff;
                        font-size:28px;
                        letter-spacing:6px;
                        padding:12px 25px;
                        border-radius:8px;
                        font-weight:bold;
                        ">
                        ${otp}
                        </div>
                    </td>
                    </tr>

                    <!-- Expiry -->
                    <tr>
                    <td style="color:#777;font-size:14px;">
                        ⏳ This OTP is valid for <strong>10 minutes</strong>.
                    </td>
                    </tr>

                    <!-- Warning -->
                    <tr>
                    <td style="color:#999;font-size:13px;padding-top:15px;">
                        If you didn’t request this, please ignore this email.
                    </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                    <td style="padding-top:25px;font-size:12px;color:#aaa;text-align:center;">
                        © ${new Date().getFullYear()} Your App. All rights reserved.
                    </td>
                    </tr>

                </table>

                </td>
            </tr>
            </table>

        </body>
        </html>
    `;
};