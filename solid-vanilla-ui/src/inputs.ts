import { h, Signal } from "solid-vanilla";

export const TextInput = (val: Signal<string>) =>
  h("input")
    .attr("type", "text")
    .attr("value", val)
    .on("change", (event) => val.set(event.target.value));

export const NumberInput = (val: Signal<number>) =>
  h("input")
    .attr("type", "number")
    .attr("value", () => `${val.get()}`)
    .on("change", (event) => val.set(event.target.value));

export const PasswordInput = (val: Signal<string>) =>
  h("input")
    .attr("type", "password")
    .on("input", (event: { target: { value: string } }) =>
      val.set(event.target.value),
    );

// Pico checkbox: <label><input type="checkbox">text</label>.
// The label makes the text clickable; the checked attribute follows the
// signal so external changes are reflected.
export const Checkbox = (val: Signal<boolean>, text: string) =>
  h("label").inner(
    h("input")
      .attr("type", "checkbox")
      .attr("checked", () => (val.get() ? "checked" : null))
      .on("change", (event) => val.set(event.target.checked)),
    text,
  );
