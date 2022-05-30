const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// name, email, photo, password, passwordConfirm

const validator = require('validator');
//console.log(validator);

const userSchema = new mongoose.Schema(
  {
    passwordChangedAt: {
      type: Date,
    },
    role: {
      type: String,
      enum: ['user', 'guide', 'lead-guide', 'admin'],
      default: 'user',
    },
    name: {
      type: String,
      required: [true, 'Please tell us your name'],
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email address'],
    },
    photo: {
      type: String,
      default: 'default.jpg',
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minLength: [8, 'the password is too short of 8 characters'],
      select: false,
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password'],
      validate: {
        //! only in save
        validator: function (val) {
          return val === this.password;
        },
        message: 'Passwords are not the same!',
      },
    },
    verifyEmailToken: String,
    verifyEmailTokenExpires: Date,
    isNewUser: {
      type: Boolean,
      select: true,
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: false,
      select: false,
    },
    twoFactorAuthentication: {
      type: Boolean,
      default: false,
      select: false,
    },
    phoneNumber: {
      type: String,
      select: false,
      validate: {
        //! only in save
        validator: function (val) {
          if (!validator.isMobilePhone(val, 'any')) {
            return false;
          } else return true;
        },
        message: 'the phone number is not valid!',
      },
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

//! cooment if you use scrpt import json from here

userSchema.pre('save', async function (next) {
  // run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // hash the password with 12 cost
  this.password = await bcrypt.hash(this.password, 12);

  // delete the password confirm
  this.passwordConfirm = undefined;
  next();
});
userSchema.pre('save', function (next) {
  if (this.verifyEmailToken === 'toEliminate') {
    //this.isNewUser = undefined;
    this.verifyEmailToken = undefined;
    return next();
  }
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

//! to here

userSchema.pre(/^find/, function (next) {
  // this point at the current query
  this.find({
    $or: [{ isNewUser: { $exists: true } }, { active: { $eq: true } }],
  });

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changePasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    //console.log(changedTimestamp > JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

userSchema.methods.createVerifyTokenForEmail = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.verifyEmailToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.verifyEmailTokenExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
