import type { AbstractIntlMessages } from "next-intl";
import type { Locale } from "./getLocale";
import en from "./messages/en.json";
import zhTW from "./messages/zh-TW.json";
import ja from "./messages/ja.json";
import vi from "./messages/vi.json";
import enAU from "./messages/en-AU.json";

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

export function loadMessages(locale: Locale): Messages {
  if (locale === "en")    return en as Messages;
  if (locale === "zh-TW") return deepMerge(en as Messages, zhTW as Messages);
  if (locale === "ja")    return deepMerge(en as Messages, ja as Messages);
  if (locale === "vi")    return deepMerge(en as Messages, vi as Messages);
  if (locale === "en-AU") return deepMerge(en as Messages, enAU as Messages);
  return en as Messages;
}
