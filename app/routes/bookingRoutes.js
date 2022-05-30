const express = require('express');
const bookingController = require('../controllers/bookingController.js');
const authController = require('../controllers/authController');

const router = express.Router();
router.use(authController.protect);

router.get('/checkout-session/:id', bookingController.getCheckoutSession);

router.use(authController.restrictTo('admin', 'lead-guide'));
router
  .route('/')
  .get(bookingController.getAllBookings)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.isPaidInTourLeadGuide, bookingController.getBooking)
  .patch(
    bookingController.isPaidInTourLeadGuide,
    bookingController.updateBooking
  )
  .delete(
    bookingController.isPaidInTourLeadGuide,
    bookingController.deleteBooking
  );

module.exports = router;
