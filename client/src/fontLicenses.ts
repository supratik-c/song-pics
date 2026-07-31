import bangersNoticeUrl from './assets/ui/fonts/bangers/OFL.txt?url';
import kalamNoticeUrl from './assets/ui/fonts/kalam/OFL.txt?url';

export type FontLicense = {
  family: string;
  noticeUrl: string;
};

export const fontLicenses: readonly FontLicense[] = [
  {
    family: 'Bangers',
    noticeUrl: bangersNoticeUrl,
  },
  {
    family: 'Kalam',
    noticeUrl: kalamNoticeUrl,
  },
];
