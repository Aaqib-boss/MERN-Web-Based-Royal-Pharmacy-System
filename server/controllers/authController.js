const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/user');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'royal_secret_key_12345', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check for user
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

// @desc    Forgot Password (Email SMTP OTP flow)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User with this email does not exist' });
    }

    // Generate random 6-digit numeric OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Generate reset token for recovery link
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiration (10 minutes) and OTP code with expiration (5 minutes)
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    user.otpCode = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000;

    await user.save();

    // Reset URL
    const resetUrl = `http://localhost:3050/login?token=${resetToken}`;

    // Prepare email transport using SMTP credentials if provided
    const hasSmtpConfig = process.env.SMTP_USER && process.env.SMTP_PASS;

    if (hasSmtpConfig && process.env.SMTP_USER !== 'example@gmail.com') {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        const mailOptions = {
          from: `"Royal Pharmacy" <${process.env.SMTP_USER}>`,
          to: email,
          subject: 'Royal Pharmacy - Password Recovery OTP',
          text: `Your Royal Pharmacy recovery OTP is ${otp}.\n\nUse the following link to reset your password:\n${resetUrl}\n\nThis OTP is valid for 5 minutes.`,
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
        };

        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${email}`);
      } catch (mailError) {
        console.error('Nodemailer SMTP failed to send email:', mailError.message);
        console.log('\n==================================================');
        console.log('*** EMAIL SENDING FALLBACK (MOCK): PASSWORD RECOVERY ***');
        console.log(`To Email: ${email}`);
        console.log(`OTP Code: ${otp}`);
        console.log(`Reset Link: ${resetUrl}`);
        console.log('==================================================\n');
      }
    } else {
      console.log('Nodemailer SMTP not configured or using placeholders. Mocking email send:');
      console.log('\n==================================================');
      console.log('*** EMAIL SENDING (MOCK): PASSWORD RECOVERY ***');
      console.log(`To Email: ${email}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Reset Link: ${resetUrl}`);
      console.log('==================================================\n');
    }

    res.status(200).json({ message: 'Recovery link and OTP code sent to your registered email address' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password (SMS/OTP verification)
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  const { token, email, otp, password } = req.body;

  try {
    let user;

    if (token) {
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');

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

    // Verify OTP code
    if (!user.otpCode || user.otpCode !== otp || !user.otpExpires || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired OTP verification code' });
    }

    // Set new password
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

// @desc    Create a user (Admin Only)
// @route   POST /api/auth/create-user
// @access  Private/Admin
const createUser = async (req, res) => {
  const { name, email, password, role, phone, address } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'User',
      phone,
      address,
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

// @desc    Get all users (Admin Only)
// @route   GET /api/auth/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a user (Admin Only)
// @route   DELETE /api/auth/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Don't let an admin delete themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile photo
// @route   PUT /api/auth/profile/photo
// @access  Private
const updateProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    // Store relative path
    user.profilePhoto = `/uploads/${req.file.filename}`;
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete user profile photo
// @route   DELETE /api/auth/profile/photo
// @access  Private
const deleteProfilePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.profilePhoto = '';
    await user.save();

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      profilePhoto: user.profilePhoto,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user details (Admin Only)
// @route   PUT /api/auth/users/:id
// @access  Private/Admin
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.address = req.body.address || user.address;

    // Prevent self-role updates
    if (req.body.role && user._id.toString() !== req.user._id.toString()) {
      user.role = req.body.role;
    }

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user (Public)
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  const { name, email, password, phone, address } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: 'User',
      phone,
      address,
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

// @desc    Delete logged-in user account & all associated data
// @route   DELETE /api/auth/profile
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    // Delete associated data
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

    // Delete the user account
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
