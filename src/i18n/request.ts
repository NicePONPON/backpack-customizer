import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./getLocale";
import { loadMessages } from "./loadMessages";

export default getRequestConfig(async () => {
  const locale = await getLocale();
  const messages = loadMessages(locale);
  return { locale, messages };
});
