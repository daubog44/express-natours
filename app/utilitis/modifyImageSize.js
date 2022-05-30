const sharp = require('sharp');
const fs = require('fs').promises;

module.exports = async function (
  imageBuffer,
  imagePathOutput,
  size = [2000, 1333],
  quality = 90
) {
  try {
    await sharp(imageBuffer)
      .resize(size[0], size[1]) // 3 / 2
      .toFormat('jpeg')
      .jpeg({ quality })
      .toFile(`${__dirname}/../../${imagePathOutput}`); //`front-end/public/img/tours/${imageFileName}`);

    return Buffer.from(
      await fs.readFile(`${__dirname}/../../${imagePathOutput}`)
    );
  } catch (e) {
    throw new Error(e);
  }
};
