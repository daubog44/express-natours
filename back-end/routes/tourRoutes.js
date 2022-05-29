const express = require('express');
const tourController = require('./../controllers/tourController');
const authController = require('./../controllers/authController');
const reviewRouter = require('./reviewRouters');
const router = express.Router();

// router.param('id', tourController.checkID);

// simple nested routes
// POST /tour/3454sgt/reviews
// GET  /tour/3454sgt/reviews

//router
//  .route('/:tourId/reviews')
//  .post(
//    authController.protect,
//    authController.restrictTo('user', 'admin'),
//    reviewController.createReview
//  );

router.use('/:tourId/reviews', reviewRouter);

router
  .route('/top-5-cheap')
  .get(tourController.aliasTopTours, tourController.allTours);

router.route('/tour-stats').get(tourController.getTourStats);
router
  .route('/monthly-plan/:year')
  .get(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide', 'guide'),
    tourController.getMonthlyPlan
  );

// geospecial queries

router.route('/distances/:latlng/unit/:unit').get(tourController.getDistances);

router
  .route('/tours-within/:distance/center/:latlng/unit/:unit')
  .get(tourController.getToursWithin);

// tours-distance?distance=233&center=-40,45&unit=km
// tours-distance/233/center/-40,45/unit/km

router
  .route('/')
  .get(tourController.allTours)
  .post(
    authController.protect,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.setTourLeadGuideId,
    tourController.createTour
  );

router
  .route('/:id')
  .get(tourController.getTour)
  .patch(
    authController.protect,
    tourController.checkIfTourIsCreatedByLeadGuide,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.uploadTourImages,
    tourController.resizeTourImages,
    tourController.updateTour
  )
  .delete(
    authController.protect,
    tourController.checkIfTourIsCreatedByLeadGuide,
    authController.restrictTo('admin', 'lead-guide'),
    tourController.deleteTour
  );

module.exports = router;
