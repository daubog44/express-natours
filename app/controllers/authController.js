const User = require('../models/userModel');
const crypto = require('crypto');
const { promisify } = require('util');
const catchAsync = require('../utilitis/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('../utilitis/appError');
const Email = require('../utilitis/email');
const { resolveSrv } = require('dns/promises');
const sendSMS = require('../utilitis/sendSMS');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    secure: false,
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;
  res.cookie('jwt', token, cookieOptions);

  // remove the password from the output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

exports.signUp = catchAsync(async function (req, res, next) {
  //! really problem security because the signup process is make with data from body, so whoever can get access with malicious code put in the body request
  //const newUser = await User.create(req.body);

  //! this resolve the problem because the data is only that we want, is like a schema for validation/verification signup
  if (req.body.role !== 'user') {
    return next(
      new AppError(
        'you can sign up only for users, if you want become lead-guide contact me!',
        403
      )
    );
  }
  const newUser = await User.create({
    role: req.body.role,
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    //passwordChangedAt: req.body.passwordChangedAt,
    isNewUser: true,
  });

  req.user = newUser;

  next();
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // check if email and password exist
  if (!email || !password) {
    next(new AppError('please provide email and password!', 400));
  }

  // check if user exist && password is correct
  const user = await User.findOne({ email }).select([
    '+password',
    '+twoFactorAuthentication',
    '+phoneNumber',
  ]);

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (user.verifyEmailToken)
    return next(new AppError('Please before log in, verify the email', 401));

  if (user.twoFactorAuthentication) {
    // send sms
    const number = Math.random().toString().slice(2, 8);

    if (!user.phoneNumber) {
      return next(new AppError('the user does not have phone number!', 401));
    }
    sendSMS(number, user.phoneNumber);

    // encrypt number
    const numToStr = number.toString();
    const numberJWT = await jwt.sign(
      { numToStr },
      process.env.SECRET_FOR_DECODE_NUMBER,
      {
        expiresIn: process.env.JWT_NUMBER_EXPIRES_IN,
      }
    );

    res.status(200).json({
      status: 'success',
      isTwoFactorEnabled: true,
      message: 'you must verify the number, is valid for five minutes',
      url: `${req.protocol}://${req.get(
        'host'
      )}/api/v1/users/twoFactorAuthentication/${numberJWT}/${user._id}`,
      data: null,
    });
    return;
  }
  // everything is ok, send token to client
  await createSendToken(user, 200, res);
});

exports.logout = (req, res, next) => {
  res.cookie('jwt', 'logged out', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({ status: 'success' });
};

exports.twoFactorAuthentication = catchAsync(async (req, res, next) => {
  const decoded = await jwt.verify(
    req.params.tokenNumber,
    process.env.SECRET_FOR_DECODE_NUMBER
  );

  //.log(decoded);

  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new AppError('the user does no longer exist.', 401));
  }

  if (decoded.numToStr === req.body.number) {
    await createSendToken(user, 200, res);
  } else {
    return next(
      new AppError('the number is incorrect, please try again.', 401)
    );
  }
});

exports.protect = catchAsync(async (req, res, next) => {
  // Getting token
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) token = req.cookies.jwt;

  if (!token)
    // verification token
    return next(
      new AppError('You are not logged in! please log in to get access.', 401)
    );

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // check if user still exists
  const freshUser = await User.findById(decoded.id).select([
    '+twoFactorAuthentication',
    '+phoneNumber',
  ]);
  if (!freshUser) {
    return next(
      new AppError('the token belonging to the user does no longer exist.', 401)
    );
  }

  // check if user changed password after the JWT was issued
  if (freshUser.changePasswordAfter(decoded.iat))
    next(
      new AppError('User recently changed password! Please log in again.', 401)
    );

  // access
  req.user = freshUser;
  res.locals.user = freshUser;

  next();
});

// only for render pages, no errors
exports.isLoggedIn = catchAsync(async (req, res, next) => {
  // Getting token
  if (req.cookies.jwt && req.cookies.jwt === 'logged out') return next();
  else if (req.cookies.jwt) {
    // verify the token
    const decoded = await promisify(jwt.verify)(
      req.cookies.jwt,
      process.env.JWT_SECRET
    );

    // check if user still exists
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
      return next();
    }

    // check if user changed password after the JWT was issued
    if (freshUser.changePasswordAfter(decoded.iat)) next();

    // there is LOGGED IN USER
    res.locals.user = freshUser;
    return next();
  }
  next();
});

exports.restrictTo = function (...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError('You do not have permission to access a this action.', 403)
      );
    next();
  };
};

exports.forgotPassword = catchAsync(async function (req, res, next) {
  // get the user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('There is no user with that email', 404));

  // generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  // send it to user's email
  //const message = `forgot your password? Submit a PATCH request with your new password and password confirm to:${resetURL}.\nIf you didn't forget your password, please ignore this email`;

  try {
    //await Email({
    //  email: user.email,
    //  subject: 'Your password reset token (valid for 10 min)',
    //  message,
    //});

    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    //    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sanding your email. Try again later.'),
      500
    );
  }
});
exports.resetPassword = catchAsync(async function (req, res, next) {
  // get user based on the token
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // if token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // update changePasswordAt property for the user
  // log the user in, send JWT

  await createSendToken(user, 200, res);
});

exports.sendEmailForVarification = catchAsync(async function (req, res, next) {
  const user = req.user;

  if (!user) return next(new AppError('There is no user with that email', 404));

  const verifyToken = user.createVerifyTokenForEmail();
  await user.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/verifyEmail/${verifyToken}`;

  //const message = `hello from Natours, verify email: ${resetURL}`;

  try {
    await new Email(user, resetURL).verifySignUp();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    //   console.log(err);
    user.verifyEmailToken = undefined;
    user.verifyEmailTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    //console.log(err);

    return next(
      new AppError('There was an error sanding your email. Try again later.'),
      500
    );
  }
});

exports.verifyEmailToken = catchAsync(async function (req, res, next) {
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.tokenVerify)
    .digest('hex');

  const user = await User.findOne({
    verifyEmailToken: hashToken,
    verifyEmailTokenExpires: { $gt: Date.now() },
  });
  // if token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }

  user.verifyEmailToken = 'toEliminate';
  user.verifyEmailTokenExpires = undefined;
  user.active = true;
  user.isNewUser = undefined;
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);

  //const url = `${req.protocol}://${req.get('host')}/me`;
  //await new Email(user, url).sendWelcome();
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // get user
  const user = await User.findById(req.user.id).select('+password');

  // check if posted current pass word is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  // if so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  if (user.password !== user.passwordConfirm)
    return next(new AppError('Incorrect password and password confirm.', 401));

  await user.save();

  // log in user, send JWT
  await createSendToken(user, 200, res);
});
