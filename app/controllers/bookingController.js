const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const catchAsync = require('../utilitis/catchAsync');
const Tour = require(`../models/tourModel`);
const Booking = require(`../models/bookingModel`);
const factory = require('./handlerFactoryControllers');
const AppError = require('../utilitis/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // get currently booked tour
  const tour = await Tour.findById(req.params.id);
  // create checkout session

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.id
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.id,
    line_items: [
      {
        name: `${tour.name} Tour`,
        description: `${tour.summary}`,
        images: [tour.iconImageUrl],
        amount: tour.price * 100,
        currency: 'eur',
        quantity: 1,
      },
    ],
  });
  // create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

exports.createBookingCheckOut = catchAsync(async (req, res, next) => {
  //! this is only TEMPORARY, because it's UNSECURE: everyone can make bookings without paying
  const { tour, user, price } = req.query;
  //console.log(tour, user, price, req.query);

  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });

  //console.log(req.originalUrl.split('?')[0]);

  res.redirect(req.originalUrl.split('?')[0]);
});

exports.isPaidInTourLeadGuide = catchAsync(async (req, res, next) => {
  const booking = await Booking.findById(req.params.id);
  const tour = await Tour.findById(booking.tour).select('+leadGuide');
  const leadGuide = tour.leadGuide;
  //console.log(req.user.id, leadGuide);

  if (leadGuide != req.user.id && req.user.role !== 'admin') {
    return next(
      new AppError(
        'This booking is not paid in your tour, please get only bookigs that paid in your tour.'
      ),
      403
    );
  }
  next();
});

exports.getBooking = factory.getOne(Booking);

exports.deleteBooking = factory.deleteOne(Booking);

exports.createBooking = factory.createOne(Booking);

exports.updateBooking = factory.updateOne(Booking);

exports.getAllBookings = factory.getAll(Booking);
