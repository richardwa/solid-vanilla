import "@picocss/pico/css/pico.min.css";
import { render } from "solid-vanilla";
import { App } from "./app/app";

render(document.getElementById("app"), App());
