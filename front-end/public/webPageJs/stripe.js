import { showAlert } from './alerts.js';
import { currentScript } from './login.js';

const currentScriptJs = currentScript;
const protocol = currentScriptJs.getAttribute('protocol');
const host = currentScriptJs.getAttribute('host');

const bookTour = async function (id) {
  try {
    const res = await fetch(
      `${protocol}://${host}/api/v1/bookings/checkout-session/${id}`,
      {
        method: 'GET',
      }
    );
    const data = await res.json();
    //console.log(data);
    alertBookingSucces(data);
  } catch (error) {
    //console.error(err);
    showAlert('error', 'error with request! ' + err.message);
  }
};

const alertBookingSucces = function (data) {
  if (data.status === 'success') {
    showAlert('success', 'check-out!');
    location.assign(`${data.session.url}`);
  } else {
    showAlert('error', `error: ${data.message}`);
  }
};

document
  .getElementById('book-tour')
  .addEventListener('click', async (event) => {
    event.preventDefault();
    showAlert('success', 'loading...');
    const { tourId } = event.target.dataset;
    await bookTour(tourId);
  });
