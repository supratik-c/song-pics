import { fontLicenses } from './fontLicenses.ts';

const licenseList =
  document.querySelector<HTMLUListElement>('#font-license-list');

if (!licenseList) {
  throw new Error('Missing font licence list');
}

const links = fontLicenses.map(({ family, noticeUrl }) => {
  const item = document.createElement('li');
  const link = document.createElement('a');

  link.className = 'legal-link';
  link.href = noticeUrl;
  link.textContent = `Read the ${family} font licence`;

  item.append(link);

  return item;
});

licenseList.replaceChildren(...links);
