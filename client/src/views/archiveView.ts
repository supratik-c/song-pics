import type { BuildPuzzleUrl } from '../navigation.ts';
import type { PuzzleArchive } from '../types.ts';

const ARCHIVE_PAGE_SIZE = 50;

export function renderArchiveContent(
  archive: PuzzleArchive,
  completedPuzzleIds: ReadonlySet<string>,
  buildPuzzleUrl: BuildPuzzleUrl,
): DocumentFragment {
  const content = document.createDocumentFragment();
  const archiveView = document.createElement('div');
  const list = document.createElement('ul');
  const pagination = document.createElement('nav');
  const previousButton = document.createElement('button');
  const pageStatus = document.createElement('p');
  const nextButton = document.createElement('button');
  const selectedIndex = Math.max(
    archive.entries.findIndex(
      (entry) => entry.id === archive.selectedPuzzleId,
    ),
    0,
  );
  const pageCount = Math.max(
    Math.ceil(archive.entries.length / ARCHIVE_PAGE_SIZE),
    1,
  );
  let currentPage = Math.floor(selectedIndex / ARCHIVE_PAGE_SIZE);

  archiveView.className = 'archive-view';
  list.className = 'archive-list';
  pagination.className = 'archive-pagination';
  pagination.setAttribute('aria-label', 'Archive pages');

  previousButton.type = 'button';
  previousButton.className = 'dialog-action-button tactile-button';
  previousButton.textContent = 'Previous';
  pageStatus.className = 'archive-page-status';
  pageStatus.setAttribute('aria-live', 'polite');
  nextButton.type = 'button';
  nextButton.className = 'dialog-action-button tactile-button';
  nextButton.textContent = 'Next';

  const renderPage = (): void => {
    const startIndex = currentPage * ARCHIVE_PAGE_SIZE;
    const pageEntries = archive.entries.slice(
      startIndex,
      startIndex + ARCHIVE_PAGE_SIZE,
    );

    list.replaceChildren(
      ...pageEntries.map((entry) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        const issueTitle = document.createElement('span');
        const badges = document.createElement('span');

        item.className = 'archive-list-item';
        link.className = 'archive-link';
        link.href = buildPuzzleUrl(entry.id, archive.latestPuzzleId);
        issueTitle.className = 'archive-issue-title';
        issueTitle.textContent =
          `Issue #${entry.issueNumber} - ${entry.songClue}`;
        badges.className = 'archive-badges';

        if (entry.id === archive.selectedPuzzleId) {
          badges.append(createBadge('Current'));
          link.setAttribute('aria-current', 'page');
        }

        if (entry.id === archive.latestPuzzleId) {
          badges.append(createBadge('Latest', 'archive-badge-latest'));
        }

        if (completedPuzzleIds.has(entry.id)) {
          badges.append(
            createBadge('Completed', 'archive-badge-completed'),
          );
        }

        link.append(issueTitle, badges);
        item.append(link);
        return item;
      }),
    );

    pageStatus.textContent = `Page ${currentPage + 1} of ${pageCount}`;
    previousButton.disabled = currentPage === 0;
    nextButton.disabled = currentPage === pageCount - 1;
    list.scrollTop = 0;
  };

  previousButton.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage -= 1;
      renderPage();
    }
  });
  nextButton.addEventListener('click', () => {
    if (currentPage < pageCount - 1) {
      currentPage += 1;
      renderPage();
    }
  });

  pagination.append(previousButton, pageStatus, nextButton);
  archiveView.append(list, pagination);
  content.append(archiveView);
  renderPage();
  return content;
}

function createBadge(label: string, extraClass?: string): HTMLSpanElement {
  const badge = document.createElement('span');
  badge.textContent = label;
  badge.className = extraClass
    ? `archive-badge ${extraClass}`
    : 'archive-badge';
  return badge;
}
