/* eslint-disable prefer-arrow-callback */
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
// eslint-disable-next-line prettier/prettier
const morgan = require('morgan');
const helmet = require('helmet');
const mongoSanitizer = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const globalErrorHandler = require(`./controllers/errorController`);
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRouters');
const viewRouter = require('./routes/viewRoutes');
const bookingRoutes = require('./routes/bookingRoutes.js');
const AppError = require('./utilitis/appError');
//! cd 'C:\Users\bogdan adrian\Desktop\programmi'
//! ./ngrok http 3000

const app = express();

// web page
app.set('view engine', 'pug');
app.set('views', path.resolve(`${__dirname}/../front-end/views`));
app.use(express.static(path.resolve(`${__dirname}/../front-end/public`)));

// GLOBAL MIDDLEWERE
// set secure http headers

app.use(
  cors({
    origin: ['*', 'https://*', 'self'],
  })
);
app.options(
  '*',
  cors({
    origin: ['*', 'https://*', 'self'],
  })
);

app.use(helmet());
const scriptSrcUrls = [
  'https://api.tiles.mapbox.com/',
  'https://api.mapbox.com/',
];
const styleSrcUrls = [
  'https://api.mapbox.com/',
  'https://api.tiles.mapbox.com/',
  'https://fonts.googleapis.com/',
];
const connectSrcUrls = [
  'https://api.mapbox.com/',
  'https://a.tiles.mapbox.com/',
  'https://b.tiles.mapbox.com/',
  'https://events.mapbox.com/',
];
const fontSrcUrls = ['fonts.googleapis.com', 'fonts.gstatic.com'];
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ['*'],
      connectSrc: ["'self'", ...connectSrcUrls],
      scriptSrc: ["'self'", ...scriptSrcUrls],
      styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
      workerSrc: ["'self'", 'blob:'],
      objectSrc: [],
      imgSrc: ["'self'", 'blob:', 'data:'],
      fontSrc: ["'self'", ...fontSrcUrls],
      imgSrc: ["'self'", 'blob:', 'data:', 'https://images.unsplash.com/'],
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
  })
);

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// set a limit for request in a hour
const globalLimiter = rateLimit({
  max: 50,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests, please try again in a hour',
});

app.use('/api', globalLimiter);

// parser body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' })); // for html forms
app.use(cookieParser());

// data sanitization againt NoSQL query injected
app.use(mongoSanitizer());
// data sanitization againt XSS
app.use(xss());
// prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  })
);

app.use(compression());
// test middleware
app.use(function (req, res, next) {
  req.requestTime = new Date().toISOString();
  //console.log(req.cookies);
  next();
});

// ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRoutes);

app.all('*', function (req, res, next) {
  return next(
    new AppError(`Can't find ${req.originalUrl} on this server`, 404)
  );
});

app.use(globalErrorHandler);

module.exports = app;
