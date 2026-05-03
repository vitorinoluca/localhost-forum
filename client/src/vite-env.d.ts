/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_SITE_NAME?: string;
  readonly VITE_SITE_DESCRIPTION?: string;
  readonly VITE_SITE_KEYWORDS?: string;
  readonly VITE_OG_IMAGE_URL?: string;
  readonly VITE_OG_IMAGE_ALT?: string;
  readonly VITE_OG_LOCALE?: string;
  readonly VITE_THEME_COLOR?: string;
  readonly VITE_TWITTER_SITE?: string;
  readonly VITE_TWITTER_CREATOR?: string;
  readonly VITE_SITE_AUTHOR?: string;
  readonly VITE_AD_LAYOUT_PREVIEW?: string;
  readonly VITE_GOOGLE_ADSENSE_CLIENT?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_TOP?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_FEED?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_ARTICLE?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_PROFILE?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_SITE_OPERATOR_NAME?: string;
  readonly VITE_LEGAL_JURISDICTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
