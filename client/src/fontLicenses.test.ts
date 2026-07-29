import { describe, expect, it } from 'vitest';
import { fontLicenses } from './fontLicenses.ts';

describe('font licence notices', () => {
  it('ships the complete Bangers OFL notice from its source file', () => {
    const bangers = fontLicenses.find(({ family }) => family === 'Bangers');

    expect(bangers).toBeDefined();
    expect(bangers?.notice).toContain(
      'Copyright 2010 The Bangers Project Authors',
    );
    expect(bangers?.notice).toContain(
      'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
    );
    expect(bangers?.notice).toContain('PERMISSION & CONDITIONS');
    expect(bangers?.notice).toContain('DISCLAIMER');
    expect(bangers?.noticeUrl).toBeTruthy();
  });

  it('ships the complete Kalam OFL notice from its source file', () => {
    const kalam = fontLicenses.find(({ family }) => family === 'Kalam');

    expect(kalam).toBeDefined();
    expect(kalam?.notice).toContain(
      'Copyright (c) 2014, Indian Type Foundry',
    );
    expect(kalam?.notice).toContain(
      'SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007',
    );
    expect(kalam?.notice).toContain('PERMISSION & CONDITIONS');
    expect(kalam?.notice).toContain('DISCLAIMER');
    expect(kalam?.noticeUrl).toBeTruthy();
  });
});
