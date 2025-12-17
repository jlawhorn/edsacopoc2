import { fetchPlaceholders } from '../../scripts/commerce.js';

let duration = 6000;
let shuffle = true;

function updateActiveSlide(slide) {
  const block = slide.closest('.carousel');
  const slideIndex = parseInt(slide.dataset.slideIndex, 10);
  block.dataset.activeSlide = slideIndex;

  const slides = block.querySelectorAll('.carousel-slide');

  slides.forEach((aSlide, idx) => {
    aSlide.setAttribute('aria-hidden', idx !== slideIndex);
    aSlide.querySelectorAll('a').forEach((link) => {
      if (idx !== slideIndex) {
        link.setAttribute('tabindex', '-1');
      } else {
        link.removeAttribute('tabindex');
      }
    });
  });

  const indicators = block.querySelectorAll('.carousel-slide-indicator');
  indicators.forEach((indicator, idx) => {
    if (idx !== slideIndex) {
      indicator.querySelector('button').removeAttribute('disabled');
    } else {
      indicator.querySelector('button').setAttribute('disabled', 'true');
    }
  });
}

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-slide');
  let realSlideIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realSlideIndex = 0;
  const activeSlide = slides[realSlideIndex];

  activeSlide
    .querySelectorAll('a')
    .forEach((link) => link.removeAttribute('tabindex'));
  block.querySelector('.carousel-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });
}

function bindEvents(block) {
  const slideIndicators = block.querySelector('.carousel-slide-indicators');
  if (!slideIndicators) return;

  slideIndicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      const slideIndicator = e.currentTarget.parentElement;
      showSlide(block, parseInt(slideIndicator.dataset.targetSlide, 10));
    });
  });

  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) updateActiveSlide(entry.target);
      });
    },
    { threshold: 0.5 },
  );
  block.querySelectorAll('.carousel-slide').forEach((slide) => {
    slideObserver.observe(slide);
  });
}

function startAutoplay(block, interval = 6000) {
  if (interval !== 0) {
    const slides = block.querySelectorAll('.carousel-slide');

    if (slides.length < 2) return;
    let currentIndex = parseInt(block.dataset.activeSlide || '0', 10);
    setInterval(() => {
      const nextIndex = (currentIndex + 1) % slides.length;
      showSlide(block, nextIndex);
      currentIndex = nextIndex;
    }, interval);
  }
}

function createSlide(row, slideIndex, carouselId) {
  const columns = Array.from(row.querySelectorAll(':scope > div'));

  if (columns.length >= 2) {
    const key = columns[0].innerText.trim().toLowerCase();
    const value = columns[1].innerText.trim();

    // Config Row: duration
    if (key === 'duration') {
      const parsed = parseInt(value, 10);

      if (!Number.isNaN(parsed)) {
        duration = parsed;
      }

      return null;
    }
    // Slide Row
    if (key === 'slide') {
      const slide = document.createElement('li');
      slide.dataset.slideIndex = slideIndex;
      slide.setAttribute('id', `carousel-${carouselId}-slide-${slideIndex}`);
      slide.classList.add('carousel-slide');

      if (columns[1]) {
        const contentColumn = columns[1];

        if (contentColumn) {
          contentColumn.classList.add('carousel-slide-content');
          const pictureParagraphs = contentColumn.querySelectorAll('p > picture');
          pictureParagraphs.forEach((picture) => {
            const p = picture.parentElement;
            p.replaceWith(picture);
          });
          console.log('contentColumn', contentColumn.outerHTML);
          slide.append(contentColumn);
        }

        const heading = contentColumn.querySelector('h2');
        const buttonContainer = contentColumn.querySelector('.button-container');

        if (heading || buttonContainer) {
          const textWrapper = document.createElement('div');
          textWrapper.classList.add('carousel-slide-content_text');
          if (heading) {
            textWrapper.append(heading);
          }
          if (buttonContainer) {
            textWrapper.append(buttonContainer);
          }
          contentColumn.append(textWrapper);
        }

        const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
        if (labeledBy) {
          slide.setAttribute('aria-labelledby', labeledBy.id);
        }
      }

      return slide;
    }
  }
  return null;
}

let carouselId = 0;
export default async function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-${carouselId}`);
  const rows = Array.from(block.querySelectorAll(':scope > div'));
  const isSingleSlide = rows.length < 2;

  const placeholders = await fetchPlaceholders();

  block.setAttribute('role', 'region');
  block.setAttribute(
    'aria-roledescription',
    placeholders.carousel || 'Carousel',
  );

  const container = document.createElement('div');
  container.classList.add('carousel-slides-container');

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-slides');
  block.prepend(slidesWrapper);

  let slideIndicators;
  if (!isSingleSlide) {
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute(
      'aria-label',
      placeholders.carouselSlideControls || 'Carousel Slide Controls',
    );
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);
    block.append(slideIndicatorsNav);
  }

  let slideCount = 0;
  const slides = [];

  rows.forEach((row) => {
    const slide = createSlide(row, slideCount, carouselId);

    if (!slide) {
      row.remove(); // config row
      return;
    }

    slides.push(slide);
    slideCount += 1;
    row.remove();
  });

  slides.forEach((slide, idx) => {
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="${
        placeholders.showSlide || 'Show Slide'
      } ${idx + 1} ${placeholders.of || 'of'} ${slides.length}"></button>`;
      slideIndicators.append(indicator);
    }
  });

  container.append(slidesWrapper);
  block.prepend(container);
  if (!isSingleSlide) {
    bindEvents(block);
    startAutoplay(block, duration);
  }
}
