import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { configDotenv } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

configDotenv();

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

const ses = new SESClient({
  region: process.env.AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const FROM_ADDRESS = process.env.FROM_ADDRESS || 'Deliverance Ministry <noreply@deliveranceministry.co.za>';
const NOTIFY_ADDRESSES = ['holla22@gmail.com', 'hello@deliveranceministry.co.za'];

app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
}));
app.use(express.json());
app.use(express.static(join(__dirname, '..')));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: 'Too many requests, please try again later.' },
});

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

app.post('/api/contact', contactLimiter, async (req, res) => {
  const { name, email, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const safeName = escapeHtml(name.trim());
  const safeEmail = escapeHtml(email.trim());
  const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br>');

  try {
    // Notify the ministry recipients
    await ses.send(new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: NOTIFY_ADDRESSES },
      ReplyToAddresses: [email.trim()],
      Message: {
        Subject: { Data: `New message from ${name.trim()}` },
        Body: {
          Text: {
            Data: `Name: ${name.trim()}\nEmail: ${email.trim()}\n\nMessage:\n${message.trim()}`,
          },
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;color:#2a2520;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="font-weight:300;letter-spacing:0.1em;">New Contact Form Submission</h2>
  <p><strong>Name:</strong> ${safeName}</p>
  <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
  <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
  <p><strong>Message:</strong></p>
  <p style="white-space:pre-wrap;">${safeMessage}</p>
</body>
</html>`.trim(),
          },
        },
      },
    }));

    // Confirmation to the person who submitted
    await ses.send(new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: [email.trim()] },
      Message: {
        Subject: { Data: 'We received your message — Deliverance Ministry' },
        Body: {
          Text: {
            Data: `Hi ${name.trim()},\n\nThank you for reaching out. We have received your message and someone will be in touch with you soon.\n\nYou are not alone.\n\nDeliverance Ministry\nhello@deliveranceministry.co.za`,
          },
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;color:#2a2520;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="font-weight:300;letter-spacing:0.1em;">Thank You, ${safeName}</h2>
  <p>We have received your message and someone will be in touch with you soon.</p>
  <p style="font-style:italic;margin-top:24px;">You are not alone.</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
  <p style="font-size:0.9em;color:#888;">
    Deliverance Ministry<br>
    <a href="mailto:hello@deliveranceministry.co.za" style="color:#888;">hello@deliveranceministry.co.za</a>
  </p>
</body>
</html>`.trim(),
          },
        },
      },
    }));

    res.json({ success: true });
  } catch (err) {
    console.error('SES error:', err);
    res.status(500).json({ error: 'Failed to send message. Please try again.' });
  }
});

app.post('/api/training', contactLimiter, async (req, res) => {
  const { name, email, phone, org, location, groupSize, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address.' });
  }

  const safeName = escapeHtml(name.trim());
  const safeEmail = escapeHtml(email.trim());
  const safePhone = phone?.trim() ? escapeHtml(phone.trim()) : null;
  const safeOrg = org?.trim() ? escapeHtml(org.trim()) : null;
  const safeLocation = location?.trim() ? escapeHtml(location.trim()) : null;
  const safeGroupSize = groupSize?.trim() ? escapeHtml(groupSize.trim()) : null;
  const safeMessage = escapeHtml(message.trim()).replace(/\n/g, '<br>');

  const row = (label, value) =>
    value ? `<tr><td style="padding:6px 12px 6px 0;color:#888;white-space:nowrap;vertical-align:top">${label}</td><td style="padding:6px 0">${value}</td></tr>` : '';

  try {
    await ses.send(new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: NOTIFY_ADDRESSES },
      ReplyToAddresses: [email.trim()],
      Message: {
        Subject: { Data: `Training application from ${name.trim()}` },
        Body: {
          Text: {
            Data: [
              `Name: ${name.trim()}`,
              `Email: ${email.trim()}`,
              safePhone ? `Phone: ${phone.trim()}` : '',
              safeOrg ? `Church / Group: ${org.trim()}` : '',
              safeLocation ? `Location: ${location.trim()}` : '',
              safeGroupSize ? `Group size: ${groupSize.trim()}` : '',
              `\nAbout their group:\n${message.trim()}`,
            ].filter(Boolean).join('\n'),
          },
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;color:#2a2520;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="font-weight:300;letter-spacing:0.1em;">New Training Application</h2>
  <table style="border-collapse:collapse;font-size:15px;width:100%">
    ${row('Name', safeName)}
    ${row('Email', `<a href="mailto:${safeEmail}">${safeEmail}</a>`)}
    ${row('Phone', safePhone)}
    ${row('Church / Group', safeOrg)}
    ${row('Location', safeLocation)}
    ${row('Group size', safeGroupSize)}
  </table>
  <hr style="border:none;border-top:1px solid #ddd;margin:16px 0;">
  <p style="margin:0 0 8px;color:#888;">About their group:</p>
  <p style="white-space:pre-wrap;margin:0;">${safeMessage}</p>
</body>
</html>`.trim(),
          },
        },
      },
    }));

    await ses.send(new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: [email.trim()] },
      Message: {
        Subject: { Data: 'Your training application — Deliverance For Me' },
        Body: {
          Text: {
            Data: `Hi ${name.trim()},\n\nThank you for applying for training. We have received your application and will be in touch personally to arrange everything — at no cost.\n\nWe are looking forward to equipping your people.\n\nDeliverance For Me\nhello@deliveranceministry.co.za`,
          },
          Html: {
            Data: `
<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;color:#2a2520;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="font-weight:300;letter-spacing:0.1em;">Thank You, ${safeName}</h2>
  <p>We have received your training application and will be in touch personally to arrange everything — at no cost.</p>
  <p style="font-style:italic;margin-top:24px;">We are looking forward to equipping your people.</p>
  <hr style="border:none;border-top:1px solid #ddd;margin:24px 0;">
  <p style="font-size:0.9em;color:#888;">
    Deliverance For Me<br>
    <a href="mailto:hello@deliveranceministry.co.za" style="color:#888;">hello@deliveranceministry.co.za</a>
  </p>
</body>
</html>`.trim(),
          },
        },
      },
    }));

    res.json({ success: true });
  } catch (err) {
    console.error('SES error:', err);
    res.status(500).json({ error: 'Failed to send application. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
