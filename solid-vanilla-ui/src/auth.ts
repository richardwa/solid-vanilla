import { h, hbox, vbox, signal } from "solid-vanilla";
import { Button, ClickLink, Panel } from "./components";
import { PasswordInput, TextInput } from "./inputs";

// Basic-auth client helpers + login/logout UI (email-archive pattern):
// credentials are validated once via POST {apiPath}/login, kept in
// localStorage, and sent as an Authorization: Basic header on every API
// call. The server stays stateless — no sessions, no cookies.

export const apiPath = "/api";

const AUTH_KEY = "auth";
const stored =
  typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_KEY) : null;
export let authHeader = stored ?? "";

/** Login name decoded from the stored Basic header ("" when anonymous). */
export const userName = signal<string>(decodeUser(authHeader));

export type Credentials = { login: string; password: string };

/** Well-known read-only guest account (auto-login for "continue as guest"). */
export const guestUser = "anon";

/** True when the current session is the read-only guest login. */
export const isGuest = () => userName.get() === guestUser;

function decodeUser(header: string): string {
  if (!header.startsWith("Basic ")) return "";
  const decoded = atob(header.slice(6));
  const sep = decoded.indexOf(":");
  return sep < 0 ? "" : decoded.slice(0, sep);
}

export const setCredentials = (credentials: Credentials) => {
  authHeader = `Basic ${btoa(`${credentials.login}:${credentials.password}`)}`;
  localStorage.setItem(AUTH_KEY, authHeader);
  userName.set(credentials.login);
};

export const clearCredentials = () => {
  authHeader = "";
  localStorage.removeItem(AUTH_KEY);
  userName.set("");
};

/** Authorization headers to merge into an API fetch (empty when anonymous). */
export const authHeaders = (): Record<string, string> =>
  authHeader ? { Authorization: authHeader } : {};

/**
 * Validate credentials against POST {apiPath}/login and store them on
 * success. Returns an error message, or "" when the login succeeded.
 */
export const login = async (credentials: Credentials): Promise<string> => {
  const res = await fetch(`${apiPath}/login`, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([credentials.login, credentials.password]),
  }).then((res) => res.json() as Promise<{ ok: boolean; error?: string }>);
  if (!res.ok) return res.error ?? "invalid login or password";
  setCredentials(credentials);
  return "";
};

/** Forget credentials and reload so the app shows the login page again. */
export const logout = () => {
  clearCredentials();
  location.reload();
};

/** Compact login form: centered panel with login/password inputs. When
 *  `guest` is set, a "continue as guest" link auto-logs-in as the read-only
 *  guest account (login "anon", password "anon"; the server's user config
 *  must define it). */
export const LoginPanel = (guest = false) => {
  const loginName = signal("");
  const password = signal("");
  const error = signal("");

  const submit = async () => {
    const message = await login({
      login: loginName.get(),
      password: password.get(),
    });
    if (message) error.set(message);
    else location.reload();
  };

  const guestSubmit = async () => {
    const message = await login({ login: guestUser, password: guestUser });
    if (message) error.set(message);
    else location.reload();
  };

  return Panel()
    .css("max-width", "20rem")
    .css("margin", "4rem auto")
    .inner(
      vbox()
        .css("gap", "0.5rem")
        .on("keydown", (event: KeyboardEvent) => {
          if (event.key === "Enter") void submit();
        })
        .inner(
          TextInput(loginName).attr("placeholder", "login"),
          PasswordInput(password).attr("placeholder", "password"),
          Button().css("cursor", "pointer").on("click", submit).inner("Login"),
          guest
            ? ClickLink()
                .css("text-align", "center")
                .css("font-size", "0.85rem")
                .css("color", "var(--pico-muted-color)")
                .on("click", guestSubmit)
                .inner("continue as guest")
            : "",
          hbox().watch(error, (node) => node.inner(error.get())),
        ),
    );
};

/** Header actions: user name + logout link (hidden when anonymous). */
export const UserBox = () =>
  hbox()
    .css("align-items", "center")
    .css("gap", "0.75rem")
    .watch(userName, (node) =>
      node.inner(
        userName.get() ? h("span").inner(userName.get()) : "",
        userName.get() ? ClickLink().on("click", logout).inner("logout") : "",
      ),
    );
