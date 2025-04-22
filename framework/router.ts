// Simple hash-based router for the mini-framework

type RouteHandler = () => void;
const routes: Record<string, RouteHandler> = {};
let notFoundHandler: RouteHandler = () => {};

/**
 * Register a route and its handler
 */
export function addRoute(path: string, handler: RouteHandler) {
  routes[path] = handler;
}

/**
 * Register a handler for unmatched routes
 */
export function setNotFoundHandler(handler: RouteHandler) {
  notFoundHandler = handler;
}

/**
 * Listen to hash changes and call the appropriate handler
 */
function onRouteChange() {
  const hash = location.hash.replace(/^#\/?/, '/');
  if (routes[hash]) {
    routes[hash]();
  } else {
    notFoundHandler();
  }
}

window.addEventListener('hashchange', onRouteChange);
window.addEventListener('DOMContentLoaded', onRouteChange);

/**
 * Navigate to a route
 */
export function navigate(path: string) {
  location.hash = path;
}
