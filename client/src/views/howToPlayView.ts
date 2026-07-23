import {
  type HowToPlayManifest,
  resolveHowToPlayImagePath,
} from '../howToPlayLoader.ts';

export function renderHowToPlayContent(
  manifest: HowToPlayManifest,
): DocumentFragment {
  const content = document.createDocumentFragment();
  const introduction = document.createElement('p');
  const instructions = document.createElement('div');
  const demo = document.createElement('section');
  const demoHeading = document.createElement('h3');
  const demoClue = document.createElement('p');
  const panels = document.createElement('div');
  const answer = document.createElement('p');

  introduction.className = 'how-to-introduction';
  introduction.textContent = manifest.introduction;
  instructions.className = 'how-to-sections';
  instructions.append(
    ...manifest.sections.map((section, index) => {
      const instruction = document.createElement('section');
      const heading = document.createElement('h3');
      const body = document.createElement('p');

      instruction.className = 'how-to-section';
      heading.textContent = `${index + 1}. ${section.heading}`;
      body.textContent = section.body;
      instruction.append(heading, body);
      return instruction;
    }),
  );

  demo.className = 'how-to-demo';
  demoHeading.textContent = 'Clue:';
  demoClue.className = 'how-to-demo-clue';
  demoClue.textContent = manifest.demo.clue;
  panels.className = 'how-to-demo-panels';
  panels.append(
    ...manifest.demo.panels.map((panel) => {
      const image = document.createElement('img');
      image.src = resolveHowToPlayImagePath(panel.src);
      image.alt = panel.alt;
      image.width = 800;
      image.height = 600;
      return image;
    }),
  );
  answer.className = 'how-to-demo-answer';
  answer.textContent =
    `Answer: ${manifest.demo.answer} by ${manifest.demo.artist}`;
  demo.append(demoHeading, demoClue, panels, answer);
  content.append(introduction, instructions, demo);
  return content;
}
