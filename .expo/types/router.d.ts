/* eslint-disable */
import * as Router from 'expo-router';

export * from 'expo-router';

declare module 'expo-router' {
  export namespace ExpoRouter {
    export interface __routes<T extends string | object = string> {
      hrefInputParams: { pathname: Router.RelativePathString, params?: Router.UnknownInputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownInputParams } | { pathname: `/approve`; params?: Router.UnknownInputParams; } | { pathname: `/did`; params?: Router.UnknownInputParams; } | { pathname: `/`; params?: Router.UnknownInputParams; } | { pathname: `/mfa`; params?: Router.UnknownInputParams; } | { pathname: `/offer`; params?: Router.UnknownInputParams; } | { pathname: `/pair`; params?: Router.UnknownInputParams; } | { pathname: `/present`; params?: Router.UnknownInputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownInputParams; };
      hrefOutputParams: { pathname: Router.RelativePathString, params?: Router.UnknownOutputParams } | { pathname: Router.ExternalPathString, params?: Router.UnknownOutputParams } | { pathname: `/approve`; params?: Router.UnknownOutputParams; } | { pathname: `/did`; params?: Router.UnknownOutputParams; } | { pathname: `/`; params?: Router.UnknownOutputParams; } | { pathname: `/mfa`; params?: Router.UnknownOutputParams; } | { pathname: `/offer`; params?: Router.UnknownOutputParams; } | { pathname: `/pair`; params?: Router.UnknownOutputParams; } | { pathname: `/present`; params?: Router.UnknownOutputParams; } | { pathname: `/_sitemap`; params?: Router.UnknownOutputParams; };
      href: Router.RelativePathString | Router.ExternalPathString | `/approve${`?${string}` | `#${string}` | ''}` | `/did${`?${string}` | `#${string}` | ''}` | `/${`?${string}` | `#${string}` | ''}` | `/mfa${`?${string}` | `#${string}` | ''}` | `/offer${`?${string}` | `#${string}` | ''}` | `/pair${`?${string}` | `#${string}` | ''}` | `/present${`?${string}` | `#${string}` | ''}` | `/_sitemap${`?${string}` | `#${string}` | ''}` | { pathname: Router.RelativePathString | Router.ExternalPathString | `/approve` | `/did` | `/` | `/mfa` | `/offer` | `/pair` | `/present` | `/_sitemap`; params?: Router.UnknownInputParams; };
    }
  }
}
