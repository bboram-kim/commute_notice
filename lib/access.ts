/** The app is single-user: a secret key in the URL unlocks settings and the widget JSON. */
export function isValidKey(key: unknown): key is string {
  const secret = process.env.APP_SECRET;
  return typeof key === "string" && !!secret && key === secret;
}
