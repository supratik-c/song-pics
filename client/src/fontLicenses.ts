import bangersNotice from './assets/ui/fonts/bangers/OFL.txt?raw';
import bangersNoticeUrl from './assets/ui/fonts/bangers/OFL.txt?url';
import kalamNotice from './assets/ui/fonts/kalam/OFL.txt?raw';
import kalamNoticeUrl from './assets/ui/fonts/kalam/OFL.txt?url';

export type FontLicense = {
  family: string;
  notice: string;
  noticeUrl: string;
};

export const fontLicenses: readonly FontLicense[] = [
  {
    family: 'Bangers',
    notice: bangersNotice,
    noticeUrl: bangersNoticeUrl,
  },
  {
    family: 'Kalam',
    notice: kalamNotice,
    noticeUrl: kalamNoticeUrl,
  },
];
