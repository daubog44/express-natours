import { showAlert } from './alerts.js';

export const currentScript =
  document.currentScript ||
  (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

const protocol = currentScript.getAttribute('protocol');
const host = currentScript.getAttribute('host');

const replaceHtmlIfTwoFactorAuth = function () {
  const removeElement = document.querySelector('.ma-bt-md');
  const replaceLabel = document.querySelector(
    'body > main > div > form > div:nth-child(1) > label'
  );
  const input = document.querySelector('.form__input');
  input.value = '';
  input.focus();
  replaceLabel.innerText = 'Number Verify';
  removeElement.innerHTML = '';

  document.querySelector('.form__input').placeholder =
    'input the number send to you!';

  return input;
};

const alertLoginSucced = function (data) {
  if (data.status === 'success') {
    showAlert('success', 'logged in successfully!');
    window.setTimeout(() => {
      location.assign('/');
    }, 1500);
  } else {
    showAlert('error', `error logging in: ${data.message}`);
  }
};

const login = async function (email, password) {
  //console.log(email, password);
  try {
    const res = await fetch(`/api/v1/users/login`, {
      method: 'POST',
      body: JSON.stringify({ email: email, password: password }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    //console.log(res);

    if (res.statusText === 'Unauthorized') {
      throw await res.json();
    } else if (res.statusText === 'Too Many Requests') {
      throw new Error('Too Many requests! Please try again after one hour.');
    }

    const dataResult = await res.json();

    if (dataResult.isTwoFactorEnabled) {
      showAlert('success', 'you must be verify number send to you!');
      return window.setTimeout(async () => {
        const input = replaceHtmlIfTwoFactorAuth();
        const button = document.querySelector(
          'body > main > div > form > div:nth-child(3) > button'
        );

        if (button)
          button.onclick = async (e) => {
            e.preventDefault();
            const res = await fetch(`${dataResult.url}`, {
              method: 'POST',
              body: JSON.stringify({ number: input.value }),
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
              },
            });
            const data = await res.json();

            alertLoginSucced(data);
          };
      }, 1500);
    }

    alertLoginSucced(dataResult);
  } catch (err) {
    //console.error(err);
    showAlert('error', 'error with request! ' + err.message);
  }
};

if (document.querySelector('.login-form'))
  document.querySelector('.form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    await login(email, password);
  });
