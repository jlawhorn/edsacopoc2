import { extractKeyValuePairs } from '../../scripts/utilities/table-data.js';
import { fetchPlaceholders } from '../../scripts/commerce.js';

const svgCloseButton = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M25.293 13.2929C25.6835 12.9024 26.3165 12.9024 26.707 13.2929C27.0976 13.6834 27.0976 14.3164 26.707 14.707L21.4141 19.9999L26.707 25.2929L26.7754 25.3691C27.0957 25.7618 27.0731 26.3408 26.707 26.707C26.3409 27.0731 25.7619 27.0957 25.3691 26.7753L25.293 26.707L20 21.414L14.707 26.707C14.3165 27.0975 13.6835 27.0975 13.293 26.707C12.9024 26.3164 12.9024 25.6834 13.293 25.2929L18.5859 19.9999L13.293 14.707C12.9024 14.3164 12.9024 13.6834 13.293 13.2929C13.6835 12.9024 14.3165 12.9024 14.707 13.2929L20 18.5859L25.293 13.2929Z" fill="currentColor"/></svg>';
const STORAGE_KEY = 'global-notice:closed';

document.addEventListener('click', (e) => {
  const button = e.target.closest('.button--hide');
  if (!button) return;

  const navContainer = document.querySelector('.nav-notice');
  if (!navContainer) return;

  navContainer.style.display = 'none';
  navContainer.setAttribute('aria-hidden', 'true');
  sessionStorage.setItem(STORAGE_KEY, 'true');
});

export default async function decorate(block) {
  const labels = await fetchPlaceholders();
  const globalNoticeData = extractKeyValuePairs(block);
  if (globalNoticeData && globalNoticeData.enabled === true && globalNoticeData.content && sessionStorage.getItem(STORAGE_KEY) !== 'true') {
    block.innerHTML = globalNoticeData.content;

    // Hide Button
    const hideButton = document.createElement('button');
    hideButton.classList.add('button', 'button--ghost', 'button--hide');
    hideButton.setAttribute('aria-label', labels.Global.Notice.dismiss.label);
    hideButton.innerHTML = svgCloseButton;
    block.appendChild(hideButton);
  } else {
    block.remove();
  }
}
