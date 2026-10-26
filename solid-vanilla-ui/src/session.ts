import { h, hbox, signal, vbox } from "solid-vanilla";
import { Button, ClickLink, Panel } from "./components";
import { PasswordInput, TextInput } from "./inputs";
import { apiPath } from "./auth";

// Session-auth client helpers: the server sets an HttpOnly session cookie
// at POST {apiPath}/login (see solid-vanilla-server's auth: "session" mode)
// and the browser sends it automatically on every API call, so no
// credentials are stored client-side. The signed-in user is fetched once
// from GET {apiPath}/me and exposed as a signal.

/** Signed-in user name ("" until loadUser resolves, and when anonymous). */
export const sessionUser = signal<string>("");

/** Load the session user from the server (call once at app startup). */
export const loadSessionUser = async (): Promise<void> => {
  const res = await fetch(`${apiPath}/me`).then(
    (res) => res.json() as Promise<{ user: string }>,
  );
  sessionUser.set(res.user);
};

/** POST {apiPath}/login; on success the server sets the session cookie.
 *  Returns an error message, or "" when the login succeeded. */
export const sessionLogin = async (
  login: string,
  password: string,
): Promise<string> => {
  const res = await fetch(`${apiPath}/login`, {
    method: "post",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([login, password]),
  }).then((res) => res.json() as Promise<{ ok: boolean; error?: string }>);
  if (!res.ok) return res.error ?? "invalid login or password";
  return "";
};

/** Drop the session and reload so the app shows the signed-out state. */
export const sessionLogout = async (): Promise<void> => {
  await fetch(`${apiPath}/logout`, { method: "post" });
  location.reload();
};

/** Separate login page: a centered panel with login/password fields. On
 *  success the session cookie is set server-side and the page reloads so
 *  the app re-renders from the fresh session. `onBack` optionally renders
 *  a link back into the app (e.g. to "#/"). */
export const LoginPage = (onBack?: () => void) => {
  const loginName = signal("");
  const password = signal("");
  const error = signal("");
  const busy = signal(false);

  const submit = async () => {
    busy.set(true);
    const message = await sessionLogin(loginName.get(), password.get());
    busy.set(false);
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
          if (event.key === "Enter" && !busy.get()) void submit();
        })
        .inner(
          h("h2")
            .css("margin", "0")
            .css("text-align", "center")
            .inner("Sign in"),
          TextInput(loginName)
            .attr("placeholder", "login")
            .attr("autocomplete", "username"),
          PasswordInput(password)
            .attr("placeholder", "password")
            .attr("autocomplete", "current-password"),
          Button()
            .css("cursor", "pointer")
            .attr("disabled", () => (busy.get() ? "disabled" : null))
            .on("click", () => void submit())
            .inner("Login"),
          onBack
            ? ClickLink()
                .css("text-align", "center")
                .css("font-size", "0.85rem")
                .css("color", "var(--pico-muted-color)")
                .on("click", onBack)
                .inner("back")
            : "",
          hbox().watch(error, (node) =>
            node.inner(
              error.get()
                ? h("span")
                    .css("color", "var(--pico-del-color)")
                    .inner(error.get())
                : "",
            ),
          ),
        ),
    );
};

/** Header actions for session auth: user name + logout link (shown only
 *  when a user is signed in). */
export const SessionUserBox = () =>
  hbox()
    .css("align-items", "center")
    .css("gap", "0.75rem")
    .watch(sessionUser, (node) =>
      node.inner(
        sessionUser.get() ? h("span").inner(sessionUser.get()) : "",
        sessionUser.get()
          ? ClickLink()
              .on("click", () => void sessionLogout())
              .inner("logout")
          : "",
      ),
    );
