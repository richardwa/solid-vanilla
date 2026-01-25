import { BaseNode, h } from "./rnode";

type Route = {
  path: string;
  component: (params: Record<string, string>) => BaseNode;
};

abstract class RouterBase {
  protected routes: Route[] = [];
  protected readonly root: BaseNode;

  constructor() {
    this.root = h("div");
    this.initListener();
  }

  abstract initListener(): void;

  abstract navigate(path: string): void;

  abstract getCurrentRoute(): string;

  getRoot() {
    this.render();
    return this.root;
  }

  addRoute(
    path: string,
    component: (params: Record<string, string>) => BaseNode,
  ) {
    this.routes.push({ path, component });
  }

  protected matchRoute(): {
    route: Route;
    params: Record<string, string>;
  } | null {
    const pathname = this.getCurrentRoute();
    for (const route of this.routes) {
      const paramNames: string[] = [];
      const regexPath = route.path.replace(/:([^/]+)/g, (_, key) => {
        paramNames.push(key);
        return "(.+?)";
      });

      const regex = new RegExp(`^${regexPath}$`);
      const match = pathname.match(regex);

      if (match) {
        const params: Record<string, string> = {};
        paramNames.forEach((name, i) => (params[name] = match[i + 1]));
        return { route, params };
      }
    }
    return null;
  }

  protected render() {
    const match = this.matchRoute();
    this.root.inner();
    if (match) {
      const node = match.route.component(match.params);
      this.root.inner(node);
    } else {
      this.root.inner("Page Not Found");
    }
  }
}

export class Router extends RouterBase {
  protected base: string;
  protected context: string;

  constructor(context: string = "") {
    super();
    const { protocol, host } = window.location;
    this.context = context;
    this.base = `${protocol}//${host}`;
  }
  initListener(): void {
    window.addEventListener("popstate", () => this.render());
  }

  navigate(path: string) {
    history.pushState({}, "", `${this.base}/${this.context}${path}`);
    this.render();
  }

  getCurrentRoute() {
    const currentPath = window.location.pathname;
    const removedBaseContext = currentPath.substring(this.context.length + 1);
    return removedBaseContext;
  }
}

export class HashRouter extends RouterBase {
  initListener(): void {
    window.addEventListener("hashchange", () => this.render());
  }
  navigate(path: string) {
    location.hash = path.startsWith("#") ? path : `#${path}`;
    this.render();
  }
  getCurrentRoute() {
    return location.hash.replace(/^#/, "") || "/";
  }
}
