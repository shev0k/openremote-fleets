import { createBrowserRouter, Navigate } from "react-router";
import type { RouteObject } from "react-router";
import { appRoutes } from "./appRoutes";
import { Layout } from "./components/Layout";

function toStandaloneRoute(route: (typeof appRoutes)[number]): RouteObject {
  return {
    path: route.path,
    lazy: route.lazy,
  };
}

function toLayoutChildRoute(route: (typeof appRoutes)[number]): RouteObject {
  if (route.index) {
    return {
      index: true,
      lazy: route.lazy,
    };
  }

  return {
    path: route.path.replace(/^\//, ""),
    lazy: route.lazy,
  };
}

const standaloneRoutes = appRoutes
  .filter((route) => route.placement === "standalone")
  .map(toStandaloneRoute);

const layoutChildRoutes = appRoutes
  .filter((route) => route.placement === "layout")
  .map(toLayoutChildRoute);

export const router = createBrowserRouter([
  ...standaloneRoutes,
  {
    path: "/",
    Component: Layout,
    children: [
      ...layoutChildRoutes,
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
