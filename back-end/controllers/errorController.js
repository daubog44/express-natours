const { render } = require('pug/lib');
const AppError = require('./../utilitis/appError');

const handleCastErrorDB = function (err) {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = function (err) {
  const message = `Duplicate field value: ${err.keyValue.name}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = function (err) {
  const errors = Object.values(err.errors).map((val) => val.message);

  const message = `invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJsonWebTokenErrorDB = function () {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleTokenExpiredErrorDB = function () {
  return new AppError('Token expired, please log in again.', 401);
};

const sendErrorDev = function (err, req, res) {
  if (req.originalUrl.startsWith('/api')) {
    res.status(err.statusCode).json({
      err: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  } else {
    console.error('ERROR 🎆🎆🎆', err);
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
};

const sendErrorProd = function (err, req, res) {
  if (req.originalUrl.startsWith('/api')) {
    if (err.isOperational) {
      res.status(err.statusCode).json({
        err: err.status,
        message: err.message,
      });

      // Prograaming or other unknown error: do not leak error details
    }
    // 1) log error
    console.error('ERROR 🎆🎆🎆', err);

    // 2) send generetic message
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
  if (err.isOperational) {
    res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });

    // Prograaming or other unknown error: do not leak error details
  }
  // 1) log error
  console.error('ERROR 🎆🎆🎆', err);
  // 2) send generetic message
  res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'try again later!',
  });
};

module.exports = function (err, req, res, _) {
  console.log(process.env.NODE_ENV);

  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  }
  if (process.env.NODE_ENV === 'production') {
    let error = { ...err, message: err.message };
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error._message === 'Tour validation failed') {
      error = handleValidationErrorDB(error);
    }
    if (error.name === 'JsonWebTokenError') error = handleJsonWebTokenErrorDB();
    if (error.name === 'TokenExpiredError') error = handleTokenExpiredErrorDB();
    sendErrorProd(error, req, res);
  }
};
