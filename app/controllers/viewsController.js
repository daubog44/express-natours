const AppError = require('../utilitis/appError');
const Tour = require('../models/tourModel');
const catchAsync = require('../utilitis/catchAsync');
const User = require('../models/userModel');
const Booking = require(`../models/bookingModel`);

exports.viewTour = catchAsync(async function (req, res, next) {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    select: '-__v',
    fields: 'review rating user',
  });

  if (!tour) {
    return next(new AppError('there is no tour with that name.', 404));
  }

  res
    .status(200)
    .set(
      'Content-Security-Policy',
      "default-src 'self' https://*.mapbox.com ;base-uri 'self';block-all-mixed-content;font-src 'self' https: data:;frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src https://cdnjs.cloudflare.com https://api.mapbox.com 'self' blob: ;script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests;"
    )
    .set('Cross-Origin-Resource-Policy', 'cross-origin')
    .set('Cross-Origin-Embedder-Policy', 'credentialless')
    .render('tour', {
      title: `${tour.name} Tour`,
      tour,
      protocol: req.protocol,
      host: req.get('host'),
    });
});

exports.overView = catchAsync(async function (req, res, next) {
  // 1) get data from collection
  //const tours = await Tour.find();
  const limit = process.env.N_TO_DISPLAY_OVERVIEW_TOURS;
  let tours = await fetch(
    `${req.protocol}://${req.get('host')}/api/v1/tours?limit=${limit}&page=1`
  );
  let lenghtTours = await fetch(
    `${req.protocol}://${req.get('host')}/api/v1/tours`
  );
  lenghtTours = await lenghtTours.json();
  tours = await tours.json();

  // 2) build template

  // 3) render template using tour data
  res.status(200).render('overview', {
    title: 'All tours',
    results: lenghtTours.results,
    tours: tours.data,
    protocol: req.protocol,
    host: req.get('host'),
    limit,
  });
});

exports.login = catchAsync(async function (req, res, next) {
  res.status(200).render('login', {
    title: 'Log into your account',
    protocol: req.protocol,
    host: req.get('host'),
  });
});

exports.getAccount = catchAsync(async function (req, res, next) {
  res.status(200).render('account', {
    title: 'Your account',
    //user: req.locals.user,
    protocol: req.protocol,
    host: req.get('host'),
  });
});

exports.updateUserData = catchAsync(async function (req, res, next) {
  const updatedUse = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUse,
    protocol: req.protocol,
    host: req.get('host'),
  });
});

exports.verifyEmail = catchAsync(async function (req, res, next) {
  res.status(200).render('verifyEmail', {
    token: req.params.tokenVerify,
    protocol: req.protocol,
    host: req.get('host'),
    title: 'Verify email',
  });
});

exports.getMyTours = catchAsync(async function (req, res, next) {
  // 1) find all bookings
  const bookings = await Booking.find({ user: req.user.id });
  // 2) find tours with returned IDs
  const tourIds = bookings.map((el) => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIds } }); // in is for array that check all value in the array and if corrispoding return the tour

  // render
  const limit = process.env.N_TO_DISPLAY_OVERVIEW_TOURS;
  res.status(200).render('overview', {
    title: 'My tours',
    tours: tours,
    results: tours.length,
    protocol: req.protocol,
    host: req.get('host'),
    limit,
  });
});
