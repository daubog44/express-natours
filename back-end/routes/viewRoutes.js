const express = require('express');
const viewController = require('./../controllers/viewsController');
const authController = require('./../controllers/authController');
const bookingController = require('./../controllers/bookingController');
const router = express.Router();

router.get(
  '/',
  bookingController.createBookingCheckOut,
  authController.isLoggedIn,
  viewController.overView
);

router.get('/tour/:slug', authController.isLoggedIn, viewController.viewTour);

router.get('/login', authController.isLoggedIn, viewController.login);

router.get('/me', authController.protect, viewController.getAccount);
router.get('/my-tours', authController.protect, viewController.getMyTours);

router.get('/verifyEmail/:tokenVerify', viewController.verifyEmail);

router.post(
  '/submit-user-data',
  authController.protect,
  viewController.updateUserData
);

module.exports = router;
