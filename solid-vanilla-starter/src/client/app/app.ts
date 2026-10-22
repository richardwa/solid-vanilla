import { h, hbox } from "solid-vanilla";
import logoUrl from "../logo.svg";
import {
  LoginPanel,
  Page,
  PageHeader,
  UserBox,
  userName,
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

// Login page when anonymous, app content otherwise (checked on load; login
// and logout both reload the page, so no reactive transition is needed).
export const App = () =>
  userName.get()
    ? Page().inner(
        PageHeader(
          hbox().css("gap", "0.5rem").inner(Logo(), "Solid Vanilla"),
          UserBox(),
        ),
        router.getRoot(),
      )
    : LoginPanel();
