export type RouteHandler = (params: Record<string, string>) => void | Promise<void>;

interface Route {
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];

  on(path: string, handler: RouteHandler) {
    const keys: string[] = [];
    const pattern = new RegExp(
      `^${path.replace(/:([a-zA-Z]+)/g, (_, key) => {
        keys.push(key);
        return '([^/]+)';
      })}$`,
    );
    this.routes.push({ pattern, keys, handler });
  }

  async navigate(hash: string) {
    const path = hash.replace(/^#\/?/, '') || '/';
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (!match) continue;
      const params: Record<string, string> = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });
      await route.handler(params);
      return;
    }
    await this.routes[0]?.handler({});
  }

  start() {
    const go = () => this.navigate(location.hash || '#/');
    window.addEventListener('hashchange', go);
    go();
  }

  link(path: string): string {
    return `#${path.startsWith('/') ? path : `/${path}`}`;
  }
}
