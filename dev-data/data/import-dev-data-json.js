/* eslint-disable import/no-dynamic-require */
const mongoose = require('mongoose');
const fs = require('fs');

const Tour = require(`./../../models/tourModel`);
const Review = require(`./../../models/reviewModel`);
const User = require(`./../../models/userModel`);

require('dotenv').config({
  path: `${__dirname}/../../../config.env`,
});

const url = `mongodb+srv://admin:la4fAbjDOI5tcnCB@cluster0.y55ee.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const options = {
  serverSelectionTimeoutMS: 5000,
  useNewUrlParser: true,
};

mongoose.connect(url, options).then(
  () => {
    console.log('DB connection successfully established!');
  },
  (err) => {
    console.log('Error connecting');
  }
);

// READ JSON FILE
const tours = JSON.parse(fs.readFileSync(`${__dirname}/tours.json`, 'utf8'));
const users = JSON.parse(fs.readFileSync(`${__dirname}/users.json`, 'utf8'));
const reviews = JSON.parse(
  fs.readFileSync(`${__dirname}/reviews.json`, 'utf8')
);

// IMPORT DATA INTO DB
const importData = async () => {
  try {
    await Tour.create(tours);
    await User.create(users, { validateBeforeSave: false });
    await Review.create(reviews, { validateBeforeSave: false });

    console.log('Data successfully created');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// DELETE DATA FROM COLLECTION
const deleteData = async () => {
  try {
    await Tour.deleteMany({ autoindex: false });
    await User.deleteMany({ autoindex: false });
    await Review.deleteMany({ autoindex: false });

    console.log('Data successfully deleted');
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if (process.argv[2] === '--import') importData();
if (process.argv[2] === '--delete') deleteData();

console.log(process.argv);
