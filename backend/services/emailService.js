const nodemailer = require('nodemailer');

const PRODUCT_URLS = {
  'Muejaza For Men (300g)':                  'https://nkherbal.com/product/muejaza-ayurvedic-food-preparation/',
  'Muejaza Plus For Men (300g)':             'https://nkherbal.com/product/muejaza-plus-ayurvedic-herbal-preparation/',
  'Shahi Kalp For Men & Women (300g)':       'https://nkherbal.com/product/shahi-kalp-ayurvedic-food-preparation/',
  'Testo – Vardhak For Men (300g)':          'https://nkherbal.com/product/testo-vardhak-ayurvedic-preparation/',
  'Kashmiri Shilajit 25g':                   'https://nkherbal.com/product/pure-kashmiri-shilajit/',
  'Kashmiri Shilajit 50g':                   'https://nkherbal.com/product/pure-kashmiri-shilajit/',
  'Muejaza & Shahi Kalp Combo (300g)':       'https://nkherbal.com/product/nk-herbal-muejaza-shahi-kalp-combo/',
};

function getProductUrl(productName) {
  // Exact match first, then partial match
  if (PRODUCT_URLS[productName]) return PRODUCT_URLS[productName];
  const key = Object.keys(PRODUCT_URLS).find(k => productName.toLowerCase().includes(k.toLowerCase().split(' ')[0]));
  return key ? PRODUCT_URLS[key] : 'https://nkherbal.com/shop';
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

function getFollowUpTemplate(customerName, productName, monthNumber) {
  const productUrl = getProductUrl(productName);
  const firstName = customerName.split(' ')[0];
  const ordinals  = { 1: '1st', 2: '2nd', 3: '3rd' };
  const ordinal   = ordinals[monthNumber] || `${monthNumber}th`;

  const subjects = {
    1: `Your ${ordinal} Month with ${productName} is Complete! 🌿`,
    2: `${ordinal} Month Done! Keep Going with ${productName} 🌿`,
    3: `3 Months Strong with ${productName}! 🌿`,
  };

  const messages = {
    1: `Congratulations on completing your <strong>first month</strong> of ${productName}!<br><br>
        Ayurvedic herbs work with your body's natural rhythms — results build gradually and strengthen over time.
        For the <strong>best results, we recommend a 3–6 month course</strong>.<br><br>
        Don't let your progress stop here. Order your <strong>Month 2 supply</strong> today and continue your wellness journey without a gap.`,

    2: `You've completed <strong>2 months</strong> with ${productName} — great commitment!<br><br>
        You're halfway through our recommended 3-month course. Consistency is key with Ayurvedic formulas —
        each month builds on the last.<br><br>
        Order your <strong>Month 3 supply</strong> now to complete your full 90-day transformation.`,

    3: `Incredible! You've completed a full <strong>3-month course</strong> of ${productName}!<br><br>
        You've given your body the time it needs to experience the full benefits of this authentic Ayurvedic formula.
        For continued wellness and sustained results, many of our customers continue for 4–6 months.<br><br>
        Ready to continue your journey? Order your next supply and maintain the results you've worked for.`,
  };

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2d6a4f,#52b788);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px;">NK Herbal</h1>
              <p style="color:#d8f3dc;margin:6px 0 0;font-size:14px;">Pure Ayurvedic Wellness</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#1b4332;font-size:16px;margin:0 0 16px;">Dear <strong>${firstName}</strong>,</p>
              <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 24px;">${messages[monthNumber]}</p>

              <!-- Highlight box -->
              <div style="background:#f0fdf4;border-left:4px solid #52b788;border-radius:6px;padding:16px 20px;margin:0 0 28px;">
                <p style="margin:0;color:#1b4332;font-size:14px;font-weight:600;">✅ Product: ${productName}</p>
                <p style="margin:6px 0 0;color:#166534;font-size:14px;">📅 Recommended course: 3–6 months for best results</p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin:0 0 28px;">
                <a href="${productUrl}" target="_blank"
                   style="display:inline-block;background:linear-gradient(135deg,#2d6a4f,#52b788);color:#ffffff;
                          text-decoration:none;padding:14px 36px;border-radius:8px;font-size:16px;
                          font-weight:700;letter-spacing:0.3px;">
                  Order Now for Month ${monthNumber + 1 <= 6 ? monthNumber + 1 : 'Next'} →
                </a>
              </div>

              <p style="color:#6b7280;font-size:13px;line-height:1.6;margin:0;">
                If you have any questions about your wellness journey, reply to this email — we're here to help! 🌿
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                NK Herbal | Pure Ayurvedic Products<br>
                <a href="https://nkherbal.com" style="color:#52b788;text-decoration:none;">nkherbal.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject: subjects[monthNumber], html };
}

async function sendFollowUpEmail(to, customerName, productName, monthNumber, customSubject, customHtml) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error('Email credentials not configured. Add EMAIL_USER and EMAIL_PASS to .env');
  }

  const transporter = createTransporter();
  const template = getFollowUpTemplate(customerName, productName, monthNumber);

  await transporter.sendMail({
    from: `"NK Herbal" <${process.env.EMAIL_USER}>`,
    to,
    subject: customSubject || template.subject,
    html:    customHtml    || template.html,
  });
}

module.exports = { sendFollowUpEmail, getFollowUpTemplate };
