import { hbox, wrap } from './lib/base-components';
import { Button } from './components';
import { Signal, render } from './lib/react-like';
import { fetchJson } from '../common/interface';


const CounterDisplay = (counter: Signal<number>) => {
  return wrap()
    .css("width", "2rem")
    .css("text-align", "center")
    .watch([counter], (el) => el.inner(counter.get().toString()));
};

const CounterDemo = () => {
  const counter = new Signal(0);
  const hello = wrap();
  fetchJson('gitLogs', 'main', 2).then(logs => {
    hello.inner(JSON.stringify(logs));
  })
  const styledButton = () => Button().css("width", "5rem");

  return hbox()
    .css("align-items", "center")
    .css("gap", "1rem")
    .inner(
      styledButton()
        .inner("+")
        .on("click", () => counter.set(counter.get() + 1)),
      CounterDisplay(counter),
      styledButton()
        .inner("-")
        .on("click", () => counter.set(counter.get() - 1)),
      hello
    );
};

render(document.getElementById("app"), CounterDemo());