const express = require('express');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

function makeCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendResetEmail(to, code) {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');
  console.log(`[Auth] Sending reset code to ${to}...`);
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: 'NK Herbal CRM <onboarding@resend.dev>',
    to,
    subject: 'Your NK Herbal CRM password reset code',
    html: `<div style="font-family:Inter,sans-serif;max-width:400px;margin:0 auto;padding:32px;background:#f6f4ee;border-radius:12px;">
      <h2 style="color:#252320;margin:0 0 8px">Password reset</h2>
      <p style="color:#666;margin:0 0 24px">Use this code to reset your NK Herbal CRM password. It expires in 15 minutes.</p>
      <div style="background:#fff;border-radius:10px;padding:20px;text-align:center;border:1px solid #e5e5e5;">
        <span style="font-size:36px;font-weight:700;letter-spacing:10px;color:#3d8a5c;">${code}</span>
      </div>
      <p style="color:#999;font-size:12px;margin:16px 0 0;text-align:center;">If you didn't request this, ignore this email.</p>
    </div>`
  });
  if (error) throw new Error(error.message);
  console.log(`[Auth] ✅ Reset code sent to ${to}`);
}

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ token: signToken(user._id), user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json(user);
});

// Send 6-digit reset code to email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    const code = makeCode();
    user.resetCode = code;
    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    // Respond immediately so the frontend never hangs
    res.json({ message: 'Reset code sent to your email' });

    // Send email in background (non-blocking)
    sendResetEmail(email, code).catch(err =>
      console.error(`[Auth] ❌ Email send failed for ${email}:`, err.message)
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Verify code + set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user || user.resetCode !== code)
      return res.status(400).json({ message: 'Invalid or expired code' });
    if (user.resetCodeExpiry < new Date())
      return res.status(400).json({ message: 'Code has expired — request a new one' });
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    user.password = newPassword;
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
