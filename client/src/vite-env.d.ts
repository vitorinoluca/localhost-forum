/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_ADSENSE_CLIENT?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_TOP?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_FEED?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_ARTICLE?: string;
  readonly VITE_GOOGLE_ADSENSE_SLOT_PROFILE?: string;
  readonly VITE_AD_LAYOUT_PREVIEW?: string;
  readonly VITE_CONTACT_EMAIL?: string;
  readonly VITE_SITE_OPERATOR_NAME?: string;
  readonly VITE_LEGAL_JURISDICTION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
