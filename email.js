/**
 * MapRank Agency — Automated Email Notification Service
 * Sends structured email notifications for new inquiries to abbasarsalan462@gmail.com
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

/**
 * Build Nodemailer Transporter
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const user = process.env.SMTP_USER || process.env.NOTIFICATION_EMAIL || 'abbasarsalan462@gmail.com';
  const pass = process.env.SMTP_PASS;

  if (!pass) {
    return null; // SMTP credentials not configured yet
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass
    }
  });
}

/**
 * Send New Inquiry Notification Email
 */
async function sendInquiryNotification(inquiry) {
  const recipient = process.env.NOTIFICATION_EMAIL || 'abbasarsalan462@gmail.com';
  const fromAddress = process.env.FROM_EMAIL || `MapRank Inquiries <${recipient}>`;

  const {
    id,
    fullName,
    email,
    phone,
    businessName,
    website,
    service,
    message,
    file
  } = inquiry;

  // Log summary to console
  console.log(`[Email Notification] New Inquiry #${id} received from "${fullName}" (${email}) for service "${service}".`);

  const transporter = createTransporter();

  if (!transporter) {
    console.log('[Email Notification] SMTP_PASS not set in .env. Skipping external email delivery. (Inquiry is securely recorded in database).');
    return { sent: false, reason: 'SMTP credentials not configured in .env' };
  }

  // Construct Email HTML Body
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .email-container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { background: #0b132b; padding: 24px; text-align: center; color: #ffffff; }
        .header h2 { margin: 0 0 6px 0; color: #38bdf8; font-size: 24px; }
        .header p { margin: 0; color: #94a3b8; font-size: 13px; }
        .content { padding: 28px; }
        .field-group { margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        .label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
        .value { font-size: 15px; color: #0f172a; margin-top: 4px; font-weight: 600; }
        .badge { display: inline-block; background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 700; }
        .message-box { background: #f8fafc; border-left: 4px solid #2563eb; padding: 14px; border-radius: 4px; margin-top: 6px; font-style: normal; color: #334155; white-space: pre-wrap; font-size: 14px; }
        .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        .btn-whatsapp { display: inline-block; background-color: #25d366; color: #ffffff; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 13px; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h2>MapRank Project Inquiry</h2>
          <p>New client consultation request submitted via MapRank agency website</p>
        </div>
        <div class="content">
          <div class="field-group">
            <div class="label">Inquiry ID</div>
            <div class="value">#${id}</div>
          </div>
          <div class="field-group">
            <div class="label">Client Full Name</div>
            <div class="value">${escapeHtml(fullName)}</div>
          </div>
          <div class="field-group">
            <div class="label">Email Address</div>
            <div class="value"><a href="mailto:${escapeHtml(email)}" style="color: #2563eb;">${escapeHtml(email)}</a></div>
          </div>
          <div class="field-group">
            <div class="label">Phone / WhatsApp</div>
            <div class="value">
              ${escapeHtml(phone)}<br>
              <a href="https://wa.me/${phone.replace(/[^0-9]/g, '')}" class="btn-whatsapp" target="_blank">Chat with Client on WhatsApp</a>
            </div>
          </div>
          <div class="field-group">
            <div class="label">Business Name</div>
            <div class="value">${escapeHtml(businessName)}</div>
          </div>
          <div class="field-group">
            <div class="label">Business Website</div>
            <div class="value">${website ? `<a href="${escapeHtml(website)}" target="_blank" style="color: #2563eb;">${escapeHtml(website)}</a>` : 'Not provided'}</div>
          </div>
          <div class="field-group">
            <div class="label">Service Requested</div>
            <div class="value"><span class="badge">${escapeHtml(service)}</span></div>
          </div>
          <div class="field-group">
            <div class="label">Project Scope / Message</div>
            <div class="message-box">${escapeHtml(message)}</div>
          </div>
          <div class="field-group" style="border-bottom: none;">
            <div class="label">Attached Document</div>
            <div class="value">${file ? `📎 ${escapeHtml(file.originalname)} (${(file.size / 1024).toFixed(1)} KB)` : 'None attached'}</div>
          </div>
        </div>
        <div class="footer">
          MapRank Agency Management Notification &bull; Delivered to ${recipient}
        </div>
      </div>
    </body>
    </html>
  `;

  // Attachments configuration
  const attachments = [];
  if (file && fs.existsSync(file.path)) {
    attachments.push({
      filename: file.originalname,
      path: file.path
    });
  }

  const mailOptions = {
    from: fromAddress,
    to: recipient,
    subject: `New Project Inquiry: ${fullName} - ${businessName} [MapRank]`,
    html: htmlContent,
    attachments
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Notification] Email sent successfully: ${info.messageId}`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[Email Notification] Failed to send email: ${err.message}`);
    return { sent: false, error: err.message };
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  sendInquiryNotification
};
