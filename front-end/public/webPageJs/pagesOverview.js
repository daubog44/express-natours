import { currentScript } from './login.js';

const containerPages = document.querySelector('.container-pages');
const containerCards = document.querySelector('.card-container');
const cards = document.querySelectorAll('.card');
const page = document.querySelector('.pages');
const currentScriptJs = currentScript;
const results = currentScriptJs.getAttribute('results');
const protocol = currentScriptJs.getAttribute('protocol');
const host = currentScriptJs.getAttribute('host');
const nPageToDisplay = +currentScriptJs.getAttribute('limit');

let pages = Math.ceil(results / nPageToDisplay); // number of results for pages by server
let contentOfPage = [...cards];
let currentPage = 1;

const pagesVisualizations = function (
  allIndexesPages,
  containerPages,
  currentPage
) {
  if (currentPage == 1) return;
  let allPages = [...allIndexesPages];
  const threeDots = createThreeDOts();
  let removePages = [];
  removePages.push(...allPages.slice(currentPage * 1 - 2, currentPage * 1));
  removePages.push(...allPages.slice(currentPage, currentPage * 1 + 1));
  containerPages.replaceChildren(...removePages, ...threeDots);
};

const createThreeDOts = function () {
  const threeDots = [];
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.classList.add('dot');
    threeDots.push(dot);
  }
  return threeDots;
};

const createIndexPage = function (number) {
  const newPage = document.createElement('div');
  newPage.classList.add('pages');
  newPage.innerText = number;
  containerPages.append(newPage);
  return newPage;
};

if (results > nPageToDisplay) {
  containerCards.replaceChildren(...contentOfPage.slice(0, nPageToDisplay));

  for (let i = 0; i < pages; i++) {
    let newPage = createIndexPage(i + 1);
    if (currentPage === i + 1) {
      newPage.style.backgroundColor = '#55c57a';
    }
  }

  let allIndexesPages = document.querySelectorAll('.pages');
  let pagesContent = [...allIndexesPages];
  //pagesContent[1].focus();
  if (pages > 4) {
    pagesVisualizations(allIndexesPages, containerPages, 2);
  }

  allIndexesPages.forEach((element) =>
    element.addEventListener('click', async function (e) {
      if (currentPage == element.innerText) return;
      currentPage = element.innerText;

      allIndexesPages.forEach(
        (element) => (element.style.backgroundColor = '#f7f7f7')
      );
      element.style.backgroundColor = '#55c57a';
      const containerCards = document.querySelector('.card-container');
      containerCards.innerHTML = '';

      let getData = await fetch(
        `/api/v1/tours?limit=${nPageToDisplay}&page=${currentPage}`
      );
      let data = await getData.json();

      data.data.forEach((tour, i) => {
        containerCards.insertAdjacentHTML(
          'beforeend',
          `<div class="card"><div class="card__header"><div class="card__picture"><div class="card__picture-overlay">&nbsp;</div><img class="card__picture-img" src="/img/tours/${
            tour.imageCover
          }" alt="${tour.name}"></div><h3 class="heading-tertirary"><span>${
            tour.name
          }</span></h3></div><div class="card__details"><h4 class="card__sub-heading">${
            tour.difficulty
          } ${tour.duration}-day tour</h4><p class="card__text">${
            tour.summary
          }</p><div class="card__data"><svg class="card__icon"><use xlink:href="/img/icons.svg#icon-map-pin"></use></svg><span>${
            tour.startLocation.description
          }</span></div><div class="card__data"><svg class="card__icon"><use xlink:href="/img/icons.svg#icon-calendar"></use></svg><span>${new Date(
            tour.startDates[0]
          ).toLocaleString('en-us', {
            month: 'long',
            year: 'numeric',
          })}</span></div><div class="card__data"><svg class="card__icon"><use xlink:href="/img/icons.svg#icon-flag"></use></svg><span>${
            tour.locations.length
          } stops</span></div><div class="card__data"><svg class="card__icon"><use xlink:href="/img/icons.svg#icon-user"></use></svg><span>${
            tour.maxGroupSize
          } people</span></div></div><div class="card__footer"><p><span class="card__footer-value">$${
            tour.price
          }</span> <span class="card__footer-text">a persona</span></p><p class="card__ratings"><span class="card__footer-value">${
            tour.ratingsAverage
          }</span> <span class="card__footer-text">ratings (${
            tour.ratingsQuantity
          })</span></p><a class="btn btn--green btn--small" href="/tour/${
            tour.slug
          }">Dettagli</a></div></div>`
        );
      });
      //const startSlice = nPageToDisplay * (currentPage - 1);
      //containerCards.replaceChildren(
      //  ...contentOfPage.slice(startSlice, startSlice + nPageToDisplay)
      //);

      pagesVisualizations(allIndexesPages, containerPages, currentPage);

      if (currentPage <= pages - 3) {
        containerPages.append(pagesContent[pagesContent.length - 1]);
      } else {
        let dots = document.querySelectorAll('.dot');
        dots.forEach((el) => containerPages.removeChild(el));
      }
    })
  );
}
