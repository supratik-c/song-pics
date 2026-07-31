import { describe, expect, it } from 'vitest';
import { fontLicenses } from './fontLicenses.ts';

describe('font licence notices', () => {
  it('links to the Bangers OFL notice without bundling its text', () => {
    const bangers = fontLicenses.find(({ family }) => family === 'Bangers');

    expect(bangers).toBeDefined();
    expect(bangers?.noticeUrl).toBeTruthy();
    expect(bangers).not.toHaveProperty('notice');
  });

  it('links to the Kalam OFL notice without bundling its text', () => {
    const kalam = fontLicenses.find(({ family }) => family === 'Kalam');

    expect(kalam).toBeDefined();
    expect(kalam?.noticeUrl).toBeTruthy();
    expect(kalam).not.toHaveProperty('notice');
  });
});
