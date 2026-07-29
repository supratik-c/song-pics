import { fontLicenses } from './fontLicenses.ts';

const licenseList = document.querySelector<HTMLElement>('#font-license-list');

if (!licenseList) {
  throw new Error('Missing font licence list');
}

const cards = fontLicenses.map(({ family, notice, noticeUrl }) => {
  const card = document.createElement('section');
  const heading = document.createElement('h2');
  const downloadLink = document.createElement('a');
  const noticeText = document.createElement('pre');

  card.className = 'license-card';

  heading.textContent = family;

  downloadLink.className = 'notice-download';
  downloadLink.href = noticeUrl;
  downloadLink.download = `${family}-OFL.txt`;
  downloadLink.textContent = `Download the ${family} licence notice`;

  noticeText.tabIndex = 0;
  noticeText.setAttribute('aria-label', `Complete ${family} font licence notice`);
  noticeText.textContent = notice;

  card.append(heading, downloadLink, noticeText);

  return card;
});

licenseList.replaceChildren(...cards);
