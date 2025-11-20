import { div, h } from "../lib";
import { router } from "./routes";

export const App = () => div(div("Title"), router.getRoot());
