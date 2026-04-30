import type { Locale } from "./getLocale";
import en from "./messages/en.json";
import zhTW from "./messages/zh-TW.json";

const BUNDLES = { en, "zh-TW": zhTW } as const;

export function loadMessages(locale: Locale) {
  return BUNDLES[locale];
}

export function loadFallbackMessages() {
  return BUNDLES.en;
}
