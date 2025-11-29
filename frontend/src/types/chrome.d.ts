// Minimal Chrome and Office types to satisfy TypeScript when building outside extension context
// For full types, install: npm i -D @types/chrome @types/office-js
// These declarations prevent TS2304 and TS2339 errors

declare const chrome: any;
declare const Office: any;

declare global {
  interface Window {
    chrome?: any;
    Office?: any;
  }
}

export {};
