const express = require('express');
const rateLimit = require('express-rate-limit');
//const multer = require('multer');

const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const userLogInLimiter = rateLimit({
  max: 12,
  windowMs: 60 * 60 * 1000,
  skipSuccessfulRequests: true,
  message: 'Too many tentative for log in, please try again in a ',
});

const userCreateAccountLimiter = rateLimit({
  max: 5,
  windowMs: 60 * 60 * 1000,
  message: 'Too many accounts created, please try again in a hour',
});

const router = express.Router();

router.post(
  '/signup',
  userCreateAccountLimiter,
  authController.signUp,
  authController.sendEmailForVarification
);
router.patch('/verifyEmail/:tokenVerify', authController.verifyEmailToken);
router.post('/login', userLogInLimiter, authController.login);
router.get('/logout', userLogInLimiter, authController.logout);
//!implementare funzionalità di rinvia sms e email, implementare i lead-guide solo se hanno effetuato un pagamneto, al momento devono contattare l' admin per diventarlo

router.post(
  '/twoFactorAuthentication/:tokenNumber/:id',
  authController.twoFactorAuthentication
);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);

// protect all routes after this middleware
router.use(authController.protect);
router.patch('/updateMyPassword', authController.updatePassword);

router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
  userController.sendEmailForNotificationChange
);
router.delete('/deleteMe', userController.deleteMe);
router.patch(
  '/userActiveTwoFactorAuthentication',
  userController.userActiveTwoFactorAuthentication
);

router.patch(
  '/userRemoveTwoFactorAuthentication',
  userController.userRemoveTwoFactorAuthentication
);

router.get('/me/:id', userController.setId, userController.getUser);

router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
