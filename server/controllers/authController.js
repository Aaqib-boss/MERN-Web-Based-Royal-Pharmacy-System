const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
const User = require('../models/user');

const resend = new Resend(process.env.RESEND_API_KEY);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'royal_secret_key_12345', {
    expiresIn: '30d',
  });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email }).select('+password');
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address || '',
        profilePhoto: user.profilePhoto,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    user.otpCode = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;

    await user.save();

    const resetUrl = `https://web-based-royal-pharmacy-system.vercel.app/login?token=${resetToken}`;

    try {
      await resend.emails.send({
        from: 'Royal Pharmacy <noreply@royalpharmacy.xyz>',
        to: email,
        subject: 'Royal Pharmacy - Password Recovery OTP',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px;">
            <h2 style="color: #10b981;">Password Recovery</h2>
            <p>Your Royal Pharmacy recovery OTP is:</p>
            <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; padding: 10px 0; color: #047857;">${otp}</div>
            <p>Use the link below to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #10b981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 0;">Reset Password</a>
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This OTP is valid for 5 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
      });
      console.log(`Email sent successfully to ${email}`);
    } catch (mailError) {
      console.error('Resend failed:', mailError.message);
      console.log(`OTP Code: ${otp}`);
    }

    res.status(200).json({ message: 'Recovery link and OTP code sent to your registered email address' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { token, email, otp, password } = req.body;
  try {
    let user;
    if (token) {
      const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
      user = await User.findOne({
        resetPasswordToken,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired password reset link' });
      }
    } else if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User with this email does not exist' });
      }
    } else {
      return res.status(400).json({ message: 'Missing parameters for reset validation' });
    }

    if (!user.otpCode || user.otpCode !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code' });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.otpCode = undefined;
    user.otpExpires = undefined;

    await user.save();
    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    const user = await User.create({
      name, email, password, role: role || 'User', phone, address,
    });
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }
    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!req.file) return res.status(400).json({ message: 'Please upload a file' });
    user.profilePhoto = `/uploads/${req.file.filename}`;
    await user.save();
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, phone: user.phone, profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.profilePhoto = '';
    await user.save();
    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, phone: user.phone, profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;
    if (req.body.role && user._id.toString() !== req.user._id.toString()) {
      user.role = req.body.role;
    }
    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const registerUser = async (req, res) => {
  const { name, email, password, phone, address } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    const user = await User.create({
      name, email, password, role: 'User', phone, address,
    });
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        profilePhoto: user.profilePhoto,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;
    const Cash = require('../models/cash');
    const Cheque = require('../models/cheque');
    const Return = require('../models/return');
    const Pharmacy = require('../models/pharmacy');
    const Product = require('../models/product');
    const Reason = require('../models/reason');

    await Cash.deleteMany({ userId });
    await Cheque.deleteMany({ userId });
    await Return.deleteMany({ userId });
    await Pharmacy.deleteMany({ userId });
    await Product.deleteMany({ userId });
    await Reason.deleteMany({ userId });

    await User.deleteOne({ _id: userId });
    res.json({ message: 'User account and all associated data deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  loginUser,
  forgotPassword,
  resetPassword,
  createUser,
  getUsers,
  deleteUser,
  updateUser,
  registerUser,
  updateProfilePhoto,
  deleteProfilePhoto,
  deleteAccount,
};
