/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEPEER_API_KEY: string;
  // Add other environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
