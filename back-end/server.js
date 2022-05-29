const mongoose = require('mongoose');
require('dotenv').config({
  path: `${__dirname}/../config.env`,
});

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 🎆 Sutting down...');
  console.log(err.name, err.message, err.stack);
  process.exit(1);
});

const app = require('./app');

const url = process.env.DATABASE_URL.replace(
  '<username>',
  `${process.env.USERNAME_DB}`
).replace('<password>', `${process.env.PASSWORD_DB}`);

//console.log(url);

const options = {
  useNewUrlParser: true,
  serverSelectionTimeoutMS: 5000,
};

mongoose
  .connect(url, options)
  .then(() => {
    console.log('DB connection successfully established!');
  })
  .catch((e) => process.emit('unhandledRejection', e));

//console.log(process.memoryUsage().heapUsed / 1024 / 1024 + ' Mgb'); //! memory used in mgb
//console.log(process.cpuUsage());
//console.log(process.hrtime([Date.now()]));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port: ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 🎆 Sutting down...');
  console.log(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1);
  });
});
