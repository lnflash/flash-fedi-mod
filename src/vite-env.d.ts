/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLASH_API_URL?: string;
  readonly VITE_GEETEST_PRODUCT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
