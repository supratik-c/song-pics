import { afterEach, describe, expect, it } from 'vitest';
import { loadAppShellIntoDocument } from '../testSupport.ts';
import { getGameElements } from './dom.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('game element contract', () => {
  it('resolves every selector against the real page shell', () => {
    loadAppShellIntoDocument();

    const elements = getGameElements();

    expect(elements.artistHint.id).toBe('artist-hint');
    expect(elements.attemptsCount.id).toBe('attempts-count');
    expect(elements.date.id).toBe('puzzle-date');
    expect(elements.doodleCredit.id).toBe('doodle-credit');
    expect(elements.form.id).toBe('guess-form');
    expect(elements.guessInput.id).toBe('guess-input');
    expect(elements.guessList.id).toBe('guess-list');
    expect(elements.howToPlayButton.id).toBe('how-to-play-button');
    expect(elements.message.id).toBe('message');
    expect(elements.modal.dialog.id).toBe('game-dialog');
    expect(elements.modal.title.id).toBe('game-dialog-title');
    expect(elements.modal.body.id).toBe('game-dialog-body');
    expect(elements.modal.closeButton.id).toBe('game-dialog-close');
    expect(elements.panels.id).toBe('panels');
    expect(elements.allReleasesButton.id).toBe('all-releases-button');
    expect(elements.revealArtistButton.id).toBe('reveal-artist-button');
    expect(elements.revealSongButton.id).toBe('reveal-song-button');
    expect(elements.resultRegion.id).toBe('result-region');
    expect(elements.shareRegion.id).toBe('share-region');
    expect(elements.songClue.id).toBe('puzzle-song-clue');
    expect(elements.validationMessage.id).toBe('validation-message');

    // The submit button has no id of its own — resolved structurally as
    // the form's submit control, so the contract test pins that shape too.
    expect(elements.submitButton.type).toBe('submit');
    expect(elements.submitButton.closest('form')).toBe(elements.form);
  });

  it('throws a descriptive error when a required element is missing', () => {
    document.body.innerHTML = '<div></div>';

    expect(() => getGameElements()).toThrow(
      'Missing element for selector: #artist-hint',
    );
  });
});
