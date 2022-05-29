const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
module.exports = async function (data, nameUrl) {
  try {
    // get Image
    //`${__dirname}/../../front-end/public/img/tours/${this.imageCover}`

    //`${__dirname}/../../front-end/public/img/contains_icon_images/icon-${this.slug}.jpeg`

    const file = await stripe.files.create({
      purpose: 'business_icon',
      file: {
        data,
        name: `${nameUrl}.jpeg`,
        type: 'image/jpeg',
      },
    });

    const fileLink = await stripe.fileLinks.create({
      file: file.id,
    });

    return fileLink.url;
  } catch (e) {
    throw new Error(e);
  }
};
