// eslint-disable-next-line import/no-useless-path-segments
const Tour = require('../models/tourModel');

module.exports = class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObject = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];

    excludedFields.forEach((el) => delete queryObject[el]);

    // 1b) Advance filtering
    let queryStr = JSON.stringify(queryObject);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  sort() {
    this.query = this.queryString.sort
      ? this.query.sort(`${this.queryString.sort.split(',').join(' ')}`)
      : this.query.sort('-createdAt');
    return this;
  }

  fieldsLimit() {
    // 3) fields limit
    this.query = this.queryString.fields
      ? this.query
          .select(`${this.queryString.fields.split(',').join(' ')}`)
          .select('-__v')
      : this.query.select('-__v'); // - excludedFields
    return this;
  }

  async pagination() {
    // 4) pagination
    const page = +this.queryString.page || 1;
    const limit = +this.queryString.limit || 100; // the huge number is beacuse i would all results possible
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    if (this.queryString.page) {
      const numTours = await Tour.countDocuments();
      if (skip >= numTours) throw new Error('this page does not exist');
    }
    return this;
  }
};
