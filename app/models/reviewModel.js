const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      default: 1,
      min: [1, 'Ratings must be above 1.0'],
      max: [5, 'Ratings must below  5.0'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a user.'],
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'review must belong to a tour.'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// indexes
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.statics.calcAvarageRatings = async function (tourId) {
  // this point on the model
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);
  //console.log(stats);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].nRating,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsAverage: 4.5,
      ratingsQuantity: 0,
    });
  }
};

// update tour on  each add document review
reviewSchema.post('save', async function () {
  this.constructor.calcAvarageRatings(this.tour);
});
// update tour on each update document review
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.clone().findOne(); // get document by query (hack)
  next();
});

reviewSchema.post(/^findOneAnd/, async function () {
  await this.r.constructor.calcAvarageRatings(this.r.tour);
});

// populate the review
reviewSchema.pre(/^find/, function (next) {
  //this.populate({
  //  path: 'tour',
  //  select: 'name',
  //}).populate({ path: 'author', select: 'name photo' });

  this.populate({ path: 'user', select: 'name photo' });
  next();
});

const Review = mongoose.model('Review', reviewSchema);

/*Review.on('index', (error) => {
  console.log(error);
});*/

module.exports = Review;
