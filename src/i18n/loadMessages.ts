import type { AbstractIntlMessages } from "next-intl";
import type { Locale } from "./getLocale";
import en from "./messages/en.json";
import zhTW from "./messages/zh-TW.json";

type Messages = AbstractIntlMessages;

function deepMerge(base: Messages, override: Messages): Messages {
  const result: Messages = { ...base };
  for (const key of Object.keys(override)) {
    const b = base[key];
    const o = override[key];
    if (
      o !== null &&
      typeof o === "object" &&
      !Array.isArray(o) &&
      b !== null &&
      typeof b === "object" &&
      !Array.isArray(b)
    ) {
      result[key] = deepMerge(b as Messages, o as Messages);
    } else {
      result[key] = o;
    }
  }
  return result;
}

// Returns locale messages with EN as base so missing zh-TW keys fall back
// to English automatically — without needing a runtime getMessageFallback fn.
export function loadMessages(locale: Locale): Messages {
  if (locale === "en") return en as Messages;
  return deepMerge(en as Messages, zhTW as Messages);
}
