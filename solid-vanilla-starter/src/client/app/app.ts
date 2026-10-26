import { fragment, h, hbox } from "solid-vanilla";
import logoUrl from "../logo.svg";
import {
  LoginPage,
  Page,
  PageHeader,
  SessionUserBox,
  loadSessionUser,
  sessionUser,
} from "solid-vanilla-ui";
import { router } from "./routes";

// Logo: the app logo image next to the page title.
export const Logo = () =>
  hbox()
    .css("align-items", "center")
    .css("gap", "0.5rem")
    .inner(
      h("img")
        .attr("src", logoUrl)
        .attr("alt", "logo")
        .attr("width", "24")
        .attr("height", "24"),
    );

// Separate login page when anonymous, app content otherwise. The session
// user is fetched from GET /api/me (HttpOnly cookie, nothing stored
// client-side); login and logout both reload the page, so no reactive
// transition is needed beyond the sessionUser watch.
export const App = () => {
  void loadSessionUser();
  return fragment().watch(sessionUser, (node) =>
    node.inner(
      sessionUser.get()
        ? Page().inner(
            PageHeader(
              hbox().css("gap", "0.5rem").inner(Logo(), "Solid Vanilla"),
              SessionUserBox(),
            ),
            router.getRoot(),
          )
        : LoginPage(),
    ),
  );
};
