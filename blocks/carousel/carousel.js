import { fetchPlaceholders } from '../../scripts/commerce.js';
import { createOptimizedPicture } from '../../scripts/aem.js';

const svgArrowLeft = '<svg width="30" height="30" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.69914 7.29289C9.08967 6.90237 9.72268 6.90237 10.1132 7.29289C10.5037 7.68342 10.5037 8.31643 10.1132 8.70696L7.82024 10.9999H19.4062C19.9585 10.9999 20.4062 11.4476 20.4062 11.9999C20.4062 12.5522 19.9585 12.9999 19.4062 12.9999H7.82024L10.1132 15.2929L10.1816 15.3691C10.5019 15.7618 10.4793 16.3408 10.1132 16.707C9.74709 17.0731 9.16809 17.0957 8.77532 16.7753L8.69914 16.707L4.69914 12.707C4.30862 12.3164 4.30862 11.6834 4.69914 11.2929L8.69914 7.29289Z" fill="currentColor" /></svg>';
const svgArrowRight = '<svg width="30" height="30" viewBox="0 0 25 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.6992 7.29289C15.0897 6.90237 15.7228 6.90237 16.1133 7.29289L20.1133 11.2929C20.5038 11.6834 20.5038 12.3164 20.1133 12.707L16.1133 16.707C15.7228 17.0975 15.0897 17.0975 14.6992 16.707C14.3087 16.3164 14.3087 15.6834 14.6992 15.2929L16.9922 12.9999H5.40625C4.85397 12.9999 4.40625 12.5522 4.40625 11.9999C4.40625 11.4476 4.85397 10.9999 5.40625 10.9999H16.9922L14.6992 8.70696L14.6309 8.63078C14.3105 8.23801 14.3331 7.65901 14.6992 7.29289Z" fill="currentColor"/></svg>';

let duration = 6000;

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

function goToRelativeSlide(block, direction) {
  const slides = block.querySelectorAll('.carousel-slide');
  if (slides.length < 2) return;

  const currentIndex = parseInt(block.dataset.activeSlide || '0', 10);
  const nextIndex = (currentIndex + direction + slides.length) % slides.length;

  showSlide(block, nextIndex);
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

  // Indicator clicks
  if (slideIndicators) {
    slideIndicators.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', (e) => {
        const slideIndicator = e.currentTarget.parentElement;
        showSlide(
          block,
          parseInt(slideIndicator.dataset.targetSlide, 10),
        );
      });
    });
  }

  // Arrow buttons
  block.querySelector('.carousel-prev')?.addEventListener('click', () => {
    goToRelativeSlide(block, -1);
  });

  block.querySelector('.carousel-next')?.addEventListener('click', () => {
    goToRelativeSlide(block, 1);
  });

  // Keyboard navigation
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToRelativeSlide(block, -1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToRelativeSlide(block, 1);
    }
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
            const img = picture.querySelector('img');
            const shouldEagerLoad = slideIndex === 0;
            p.replaceWith(createOptimizedPicture(img.src, img.alt, shouldEagerLoad, [{ width: '2000' }]));
          });
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
  block.setAttribute('tabindex', '0');
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
  let controls;

  if (!isSingleSlide) {
    controls = document.createElement('div');
    controls.classList.add('carousel-controls');

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.type = 'button';
    prevButton.classList.add('carousel-prev', 'carousel-arrow-button');
    prevButton.setAttribute(
      'aria-label',
      placeholders.previous || 'Previous slide',
    );
    prevButton.innerHTML = svgArrowLeft;

    // Indicators
    const slideIndicatorsNav = document.createElement('nav');
    slideIndicatorsNav.setAttribute(
      'aria-label',
      placeholders.carouselSlideControls || 'Carousel Slide Controls',
    );

    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-slide-indicators');
    slideIndicatorsNav.append(slideIndicators);

    // Next button
    const nextButton = document.createElement('button');
    nextButton.type = 'button';
    nextButton.classList.add('carousel-next', 'carousel-arrow-button');
    nextButton.setAttribute(
      'aria-label',
      placeholders.next || 'Next slide',
    );
    nextButton.innerHTML = svgArrowRight;

    // Order matters here
    controls.append(prevButton);
    controls.append(slideIndicatorsNav);
    controls.append(nextButton);

    block.append(controls);
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
