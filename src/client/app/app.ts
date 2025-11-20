import { div } from "../lib";
import { Title } from "./components";
import { router } from "./routes";

export const App = () =>
  div()
    .css("padding", "0.5rem")
    .inner(
      Title("Git Logs").css("font-weight", "bold").css("margin-bottom", "1rem"),
      router.getRoot(),
    );
