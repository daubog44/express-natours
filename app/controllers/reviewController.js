const factory = require('./handlerFactoryControllers');
const Review = require('../models/reviewModel');
const catchAsync = require('../utilitis/catchAsync');
const AppError = require('../utilitis/appError');

exports.setTourUserIds = (req, res, next) => {
  // allow nested route
  if (!req.body.tour) {
    req.body.tour = req.params.tourId;
  }

  if (!req.body.user) {
    req.body.user = req.user.id;
  }

  next();
};

exports.checkIfReviewIsCreatedByUser = catchAsync(async function (
  req,
  res,
  next
) {
  const review = await Review.findById(req.params.id);
  //  console.log(review.user._id, 'ddddd', req.user.id);
  if (review.user._id != req.user.id && req.user.role !== 'admin')
    return next(
      new AppError(
        "This review is not created by you, you can't do it! Please do it only review created by you."
      ),
      403
    );
  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.createReview = factory.createOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.getReview = factory.getOne(Review);
