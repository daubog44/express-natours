import { showAlert } from './alerts.js';
import { currentScript } from './login.js';

const currentScriptJs = currentScript;
const logoutBtn = document.querySelector('.nav__el--logout');
const protocol = currentScriptJs.getAttribute('protocol');
const host = currentScriptJs.getAttribute('host');

const logout = async function () {
  try {
    //console.log('helloo');
    const res = await fetch(`/api/v1/users/logout`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();

    // reload page
    if (data.status === 'success')
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
  } catch (err) {
    //console.log(err);
    showAlert('error', 'Error loggin out, try again!');
  }
};

logoutBtn.addEventListener('click', logout);
