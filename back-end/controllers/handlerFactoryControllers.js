const catchAsync = require('../utilitis/catchAsync');
const AppError = require('../utilitis/appError');
const APIFeatures = require(`../utilitis/apiFeaturesFilter`);

exports.deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const document = await Model.findByIdAndDelete(req.params.id);

    if (!document)
      return next(new AppError('no document found with this id', 404));

    res.status(200).json({
      status: 'success',
    });
  });

exports.updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) return next(new AppError('no document found with this id', 404));

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    //const newTour = new Tour({});
    //newTour.save();
    const doc = await Model.create(req.body);

    if (!doc) return next(new AppError('no document found with this id', 404));

    if (doc.images && doc.images.length > 3) {
      return next(new AppError('the images are more than 3', 400));
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

exports.getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    let filter = { verifyEmailToken: undefined };

    console.log(req.params.id, Model);
    let query = Model.find({ _id: req.params.id, ...filter });
    if (popOptions) query = query.populate(popOptions);
    const document = await query;
    //const document = await Model.findById(req.params.id).populate('reviews');

    if (!document || document.toString() === '')
      return next(new AppError('no document found with this id', 404));

    res.status(200).json({
      status: 'success',
      data: document,
    });
  });

exports.getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // to allow for nested GET reviews on tour (hack)
    let filter = { verifyEmailToken: undefined };
    if (req.params.tourId) filter = { ...filter, tour: req.params.tourId };

    // BUILD QUERY
    const features = await new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .fieldsLimit()
      .pagination();

    // EXECUTE query
    //const document = await features.query.explain();
    const document = await features.query;

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: document.length,
      data: document,
    });
  });
