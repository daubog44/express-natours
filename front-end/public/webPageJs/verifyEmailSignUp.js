import { currentScript } from './login.js';
import { showAlert } from './alerts.js';

const protocol = currentScript.getAttribute('protocol');
const host = currentScript.getAttribute('host');
const token = currentScript.getAttribute('token');

const verify = async function () {
  try {
    const url = `/api/v1/users/verifyEmail/${token}`;
    let res = await fetch(url, {
      method: 'PATCH',
    });
    const data = await res.json();
    if (data.status !== 'success') throw data;
    showAlert('success', 'you are logged in!');

    window.setTimeout(() => {
      location.assign('/me');
    }, 1500);
  } catch (e) {
    //console.log(e);
    return showAlert('error', e.message);
  }
};

verify();
