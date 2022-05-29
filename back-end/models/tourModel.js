const mongoose = require('mongoose');
const slugify = require('slugify');
const modifyImageSizes = require('./../utilitis/modifyImageSize');
const generateImageUrl = require('./../utilitis/genereteImageUrl.js');
const fs = require('fs').promises;

//! CHECK VALIDATOR NPM https://www.npmjs.com/package/validator
//const validator = require('validator');

const tourSchema = new mongoose.Schema(
  {
    //!
    leadGuide: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a lead-guide.'],
      select: false,
    },
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxLength: [40, 'the name is too long of 40 characters'],
      minLength: [10, 'the name is too short of 10 characters'],
      //validate: [validator.isAlpha, 'Tour name must only contain characters'],
    },
    slug: {
      type: String,
    },
    duration: {
      type: Number,
      required: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'difficulty is either: easy, medium or difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 4.5,
      min: [1, 'Ratings must be above 1.0'],
      max: [5, 'Ratings must below  5.0'],
      set: (val) => Math.round(val * 10) / 10,
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscout: {
      type: Number,
      validate: {
        validator: function (value) {
          //! this keyword not working for update
          // eslint-disable-next-line no-unneeded-ternary
          return value < this.price ? true : false;
        },

        message: 'the discout ({VALUE}) is too mutch then price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: {
      type: String,
      required: [true, 'A tour must have a cover image'],
    },
    iconImageUrl: {
      type: String,
      required: false,
      default: '',
    },
    images: [String],
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    startDates: [Date],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number,
      },
    ],
    guides: [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

//! DOCUMENT MIDDLEWARE: runs before save() and create() not insertMany()

tourSchema.virtual('durationWeeks').get(function () {
  if (this.duration) return this.duration / 7;
});

// virtual populate
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour', // the field in the Review Schema
  localField: '_id', // the value of foreignField
});

tourSchema.pre('save', async function (next) {
  // this keyword point on document
  this.slug = slugify(this.name, { lower: true });
  try {
    const buffer = Buffer.from(
      await fs.readFile(`front-end/public/img/tours/${this.imageCover}`)
    );
    console.log(buffer);
    const imageBuffer = await modifyImageSizes(
      buffer,
      `front-end/public/img/contains_icon_images/icon-${this.slug}.jpeg`,
      [150, 150],
      100
    );

    const fileLink = await generateImageUrl(
      imageBuffer,
      `icon-${this.slug}.jpeg`
    );

    this.iconImageUrl = fileLink;
  } catch (err) {
    next(err);
  }
  next();
});

//tourSchema.post('save', function (doc, next) {
//  console.log(doc);
//  next();
//});

//! QUERY MIDDLEWARE
tourSchema.pre(/^find/, function (next) {
  // this keyword point on query
  // eslint-disable-next-line prefer-arrow-callback
  this.find({ secretTour: { $ne: true } }); //! because the query is an object
  this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt',
  });

  next();
});

tourSchema.post(/^find/, function (docs, next) {
  this.find({ secretTour: { $ne: true } });
  next();
});

//! AGGREGATION MIDDLEWARE
tourSchema.pre('aggregate', function (next) {
  const { $geoNear } = this.pipeline()[0];
  //  console.log($geoNear);
  if (!$geoNear) {
    this.pipeline().unshift({
      $match: { secretTour: { $ne: true } },
    });
  }
  //console.log(this.pipeline()); // this keyword point on aggregation object
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
