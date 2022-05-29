const User = require('../models/userModel');
const AppError = require('../utilitis/appError');
const catchAsync = require('../utilitis/catchAsync');
const factory = require('./handlerFactoryControllers');
const sendEmail = require('../utilitis/email');
const multer = require('multer');
const fs = require('fs').promises;
const modifyImageSizes = require('./../utilitis/modifyImageSize');

//const multerStorage = multer.diskStorage({
//  destination: (req, file, cb) => {
//    cb(null, 'front-end/public/img/users');
//  },
//  filename: (req, file, cb) => {
//    const ext = file.mimetype.split('/')[1];
//    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//  },
//});

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Not image! Please upload only valid images file.', 400),
      false
    );
  }
};
const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

const filterObj = function (obj, ...allowedFields) {
  let objFiltered = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      objFiltered[el] = obj[el];
    }
  });
  return objFiltered;
};

exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async function (req, res, next) {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  console.log(typeof req.file.buffer);
  await modifyImageSizes(
    req.file.buffer,
    `front-end/public/img/users/${req.file.filename}`,
    [500, 500]
  );

  next();
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'you can not change password from here, please try in update password route.',
        400
      )
    );
  }
  // 2) update user document
  const filterBody = filterObj(req.body, 'name', 'email');
  if (req.file) {
    if (req.user.photo)
      fs.unlink(`front-end/public/img/users/${req.user.photo}`, function (err) {
        if (err) return next(new AppError(err.message), 400);
        // if no error, file has been deleted successfully
      });
    filterBody.photo = req.file.filename;
  }

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filterBody, {
    new: true,
    runValidators: true,
  });

  if (req.body.email !== req.user.email) return next();

  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

exports.setId = function (req, res, next) {
  req.params.id = req.user._id;
  return next();
};

exports.sendEmailForNotificationChange = catchAsync(async (req, res, next) => {
  const message = `Hello, you have changed your email of Natours!`;
  console.log('email changed!');
  try {
    await sendEmail({
      email: req.body.email,
      subject: 'Hi From Natours',
      message,
    });

    res.status(200).json({
      status: 'success',
      data: null,
    });
  } catch (err) {
    return next(
      new AppError('There was an error sanding your email. Try again later.'),
      500
    );
  }
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  return res.status(500).json({
    status: 'error',
    message: 'This rout is not yet defined! please use /signup instead',
  });
};

exports.userActiveTwoFactorAuthentication = catchAsync(
  async (req, res, next) => {
    if (!req.body.phoneNumber)
      return next(new AppError('You must been provide phone number!', 400));
    await User.findByIdAndUpdate(
      req.user.id,
      {
        twoFactorAuthentication: true,
        phoneNumber: req.body.phoneNumber
          ? req.body.phoneNumber
          : next(
              new AppError(
                'You not have the phone number for sending message!',
                400
              )
            ),
      },
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      status: 'success',
      message:
        'attention! you will not be able to change the phone number if you are not logged in, check that it is correct.',
      data: null,
    });
  }
);

exports.userRemoveTwoFactorAuthentication = catchAsync(
  async (req, res, next) => {
    const user = await User.findById(req.user.id);

    user.twoFactorAuthentication = false;
    user.phoneNumber = undefined;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({
      status: 'success',
      data: null,
    });
  }
);

exports.getUser = factory.getOne(User);

exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);

exports.getAllUsers = factory.getAll(User);
