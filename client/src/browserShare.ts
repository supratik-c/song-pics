import {
  getCopyText,
  type PreferredShareAction,
  type PuzzleShareRequest,
  type ShareGateway,
  type ShareOutcome,
} from './share.ts';

type ShareEnvironment = {
  isMobilePlatform: boolean;
  share?: (data: ShareData) => Promise<void>;
  writeText?: (text: string) => Promise<void>;
  legacyCopy: (text: string) => boolean;
};

type PlatformSignals = {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  userAgentDataMobile?: boolean;
};

export function createBrowserShareGateway(
  environment: ShareEnvironment = createBrowserEnvironment(),
): ShareGateway {
  const preferredAction: PreferredShareAction =
    environment.isMobilePlatform && environment.share
      ? 'native-share'
      : 'copy';

  const copyInvite = async (
    request: PuzzleShareRequest,
  ): Promise<ShareOutcome> => {
    const copyText = getCopyText(request);

    if (environment.writeText) {
      try {
        await environment.writeText(copyText);
        return 'copied';
      } catch {
        // Continue to the synchronous fallback.
      }
    }

    return environment.legacyCopy(copyText) ? 'copied' : 'failed';
  };

  return {
    preferredAction,
    share: async (request) => {
      if (preferredAction === 'copy' || !environment.share) {
        return copyInvite(request);
      }

      const shareData: ShareData = {
        title: request.title,
        text: request.text,
        url: request.url,
      };

      try {
        await environment.share(shareData);
        return 'shared';
      } catch (error) {
        if (isShareCancellation(error)) {
          return 'cancelled';
        }

        return copyInvite(request);
      }
    },
  };
}

function createBrowserEnvironment(): ShareEnvironment {
  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: { mobile?: boolean };
  };

  return {
    isMobilePlatform: isMobileSharePlatform({
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      maxTouchPoints: navigator.maxTouchPoints,
      userAgentDataMobile: navigatorWithUserAgentData.userAgentData?.mobile,
    }),
    share: navigator.share?.bind(navigator),
    writeText: navigator.clipboard?.writeText.bind(navigator.clipboard),
    legacyCopy,
  };
}

export function isMobileSharePlatform(signals: PlatformSignals): boolean {
  if (signals.userAgentDataMobile === true) {
    return true;
  }

  if (/Android|iPhone|iPad|iPod/i.test(signals.userAgent)) {
    return true;
  }

  return /Macintosh/i.test(signals.userAgent) &&
    signals.platform === 'MacIntel' &&
    signals.maxTouchPoints > 1;
}

function isShareCancellation(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError';
}

function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');

  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();

  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    textarea.remove();
  }
}
