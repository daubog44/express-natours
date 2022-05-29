import { currentScript } from './login.js';
import { showAlert } from './alerts.js';

const protocol = currentScript.getAttribute('protocol');
const host = currentScript.getAttribute('host');
const user = JSON.parse(currentScript.getAttribute('twoFactorAuthentication'));
const userTFAuth = user.twoFactorAuthentication;
const inputForm = document.querySelector('.form-user-data');
const inputFormPassword = document.querySelector('.form-user-password');
const twoFactorAuth = document.getElementById('enable');
const inputPhoneNumber = document.getElementById('phone-current');
const inputImage = document.getElementById('photo');
inputImage.style.display = 'none';
document.getElementById('pointer').style.cursor = 'pointer';

// update settings
const updateSettings = async function (data, type) {
  try {
    const url =
      type === 'password'
        ? `${protocol}://${host}/api/v1/users/updateMyPassword`
        : `${protocol}://${host}/api/v1/users/updateMe`;
    data =
      type === 'password'
        ? JSON.stringify({
            ...data,
          })
        : data;

    const res = await fetch(url, {
      method: 'PATCH',
      body: data,
    });

    //ìì console.log(await res.json());
    if (res.ok) {
      return showAlert(
        'success',
        `You have successfully changed your account ${type.toUpperCase()}! `
      );
    }

    throw await res.json();
  } catch (e) {
    console.log(e);
    return showAlert('error', e.message);
  }
};

const getMyPhoto = async function (id) {
  try {
    let res = await fetch(`${protocol}://${host}/api/v1/users/me/${id}`, {
      method: 'GET',
    });
    let data = await res.json();
    return data.data[0].photo;
  } catch (e) {
    console.log(e);
    return showAlert('error', e.message);
  }
};

inputForm.addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = new FormData();
  form.append('name', document.getElementById('name').value);
  form.append('email', document.getElementById('email').value);
  form.append('photo', inputImage.files[0]);

  await updateSettings(form, 'data');
  if (inputImage.files[0]) {
    let photo = await getMyPhoto(user.id);
    document
      .querySelector('.form__user-photo')
      .setAttribute('src', `/img/users/${photo}`);
    document
      .querySelector('.nav__user-img')
      .setAttribute('src', `/img/users/${photo}`);
  }
});

inputFormPassword.addEventListener('submit', async function (e) {
  e.preventDefault();
  document.querySelector('.btn--save--password').textContent = 'Updating...';

  const passwordCurrent = document.getElementById('password-current').value;
  const password = document.getElementById('password').value;
  const passwordConfirm = document.getElementById('password-confirm').value;

  await updateSettings(
    { passwordCurrent, password, passwordConfirm },
    'password'
  );

  document.getElementById('password-current').value = '';
  document.getElementById('password').value = '';
  document.getElementById('password-confirm').value = '';
  document.querySelector('.btn--save--password').textContent = 'SAVE PASSWORD';
});

// twoFactorAuth settings

const toggleTwoFactorAuth = async function (toggle, number) {
  try {
    const url =
      toggle === 0
        ? `${protocol}://${host}/api/v1/users/userRemoveTwoFactorAuthentication`
        : `${protocol}://${host}/api/v1/users/userActiveTwoFactorAuthentication`;
    const bodySend =
      toggle === 1
        ? JSON.stringify({ phoneNumber: number.split(' ').join('') })
        : null;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
      body: bodySend,
    });
    if (res.ok) {
      return showAlert(
        'success',
        `You have been successfully ${
          toggle === 0 ? 'disable' : 'enable'
        } two factor auth!`
      );
    }

    throw await res.json();
  } catch (e) {
    console.log(e);
    showAlert('error', e.message);
    return 'error';
  }
};

let userPhoneNumber = null;
let toggle = 0;
if (userTFAuth) {
  toggle = 1;
  userPhoneNumber = JSON.parse(
    currentScript.getAttribute('twoFactorAuthentication')
  ).phoneNumber;
  document.getElementById('phone-current').value = `${userPhoneNumber}`;
  twoFactorAuth.click();
  inputPhoneNumber.setAttribute('readonly', true);
}

let checkError = null;
twoFactorAuth.addEventListener('change', async function (e) {
  e.preventDefault();
  const spinner = document.createElement('div');
  spinner.classList.add('loader');
  const parentEl = document.querySelector('.form__radio-label');
  parentEl.style.pointerEvents = 'none';
  parentEl.replaceChild(spinner, document.querySelector('.form__radio-button'));

  toggle === 1 ? (toggle = 0) : (toggle = 1);

  checkError = await toggleTwoFactorAuth(
    toggle,
    document.getElementById('phone-current').value
  );

  if (checkError === 'error') {
    checkError = null;
    toggle === 1 ? (toggle = 0) : (toggle = 1);
    twoFactorAuth.checked = toggle === 1 ? true : false;
  }

  const replaceItme = document.createElement('span');
  replaceItme.classList.add('form__radio-button');
  parentEl.innerText = 'enable/disable';
  parentEl.appendChild(replaceItme);
  parentEl.style.pointerEvents = 'auto';

  if (toggle === 0) {
    document.getElementById('phone-current').value = '';
    inputPhoneNumber.removeAttribute('readonly');
  } else {
    inputPhoneNumber.setAttribute('readonly', true);
  }
});
