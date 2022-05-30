const catchAsync = require('../utilitis/catchAsync');
const AppError = require('../utilitis/appError');
const Tour = require(`../models/tourModel`);
const factory = require('./handlerFactoryControllers');
const multer = require('multer');
const modifyImageSizes = require('../utilitis/modifyImageSize');
const generateImageUrl = require('../utilitis/genereteImageUrl.js');

// ROUTE HANDLER
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(
      new AppError('Not image! Please upload only valid images file.', 400),
      false
    );
  }
};

const upload = multer({ storage: multerStorage, fileFilter: multerFilter });

exports.uploadTourImages = upload.fields([
  {
    name: 'imageCover',
    maxCount: 1,
  },
  {
    name: 'images',
    maxCount: 3,
  },
]);

//upload.single("image");
//upload.array('images', 5);

exports.resizeTourImages = catchAsync(async function (req, res, next) {
  if (!req.files) return next();
  //req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;

  const tour = await Tour.findById(req.params.id);

  if (req.files.imageCover) {
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;

    // modify the imageCover
    await modifyImageSizes(
      req.files.imageCover[0].buffer,
      `front-end/public/img/tours/${req.body.imageCover}`
    );

    // modify the imageCover-icon
    const ris = await modifyImageSizes(
      req.files.imageCover[0].buffer,
      `front-end/public/img/contains_icon_images/icon-${this.slug}.jpeg`,
      [150, 150],
      100
    );

    // get image cover url and update
    const fileLink = await generateImageUrl(ris, `icon-${this.slug}.jpeg`);

    await Tour.findByIdAndUpdate(
      req.params.id,
      { iconImageUrl: fileLink },
      {
        new: true,
        runValidators: true,
      }
    );
  }

  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (file, i) => {
        const imageFileName = `tour-${req.params.id}-${Date.now()}-${
          i + 1
        }.jpeg`;

        await modifyImageSizes(
          file.buffer,
          `front-end/public/img/tours/${imageFileName}`
        );
        req.body.images.push(imageFileName);
      })
    );
  }

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = 5;
  req.query.sort = '-ratingsAverage, price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.allTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        //_id: '$ratingsAverage',
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
    /*   {
        $match: { _id: { $ne: 'EASY' } },
      },
      */
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = +req.params.year;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates',
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStars: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $addFields: { month: '$_id' },
    },
    {
      $project: { _id: 0 },
    },
    {
      $sort: { month: 1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

// /tours-within/:distance/center/:latlng/unit/:unit
// /tours-within/233/center/34.111745,-118.113491/unit/mi

exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // 3963.2 is the number of radius of the earth in miglia
  // 6378.1 is the number of radius of the earth in km
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  // geoSpecial query, in geoJson format the lng is specified first
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: { data: tours },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng.',
        400
      )
    );
  }

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  // Geospatial aggregation pipeline, geoNear have need to be configured first
  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier,
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { data: distances },
  });
});

exports.setTourLeadGuideId = (req, res, next) => {
  // allow nested route

  req.body.leadGuide = req.user.id;

  next();
};

exports.checkIfTourIsCreatedByLeadGuide = catchAsync(async function (
  req,
  res,
  next
) {
  const tour = await Tour.findById(req.params.id).select('+leadGuide');
  //console.log(tour.leadGuide);

  if (tour.leadGuide != req.user.id && req.user.role !== 'admin')
    return next(
      new AppError(
        "This tour is not created by you, you can't do it! Please do it only tour created by you."
      ),
      403
    );
  next();
});
