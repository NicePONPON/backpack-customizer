import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./getLocale";
import { loadMessages, loadFallbackMessages } from "./loadMessages";

export default getRequestConfig(async () => {
  const locale = await getLocale();
  const messages = loadMessages(locale);
  const fallbackMessages = loadFallbackMessages();

  return {
    locale,
    messages,
    getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
      const path = namespace ? `${namespace}.${key}` : key;
      return readByPath(fallbackMessages, path) ?? path;
    },
  };
});

function readByPath(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}
