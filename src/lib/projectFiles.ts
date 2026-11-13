// Bundles all project source files as raw strings for in-browser zip download.
// Uses Vite's ?raw import suffix to embed file contents at build time.

// Source files (src/)
import AppRaw from '../App.tsx?raw';
import mainRaw from '../main.tsx?raw';
import indexCssRaw from '../index.css?raw';
import viteEnvRaw from '../vite-env.d.ts?raw';

import LayoutRaw from '../components/Layout.tsx?raw';
import RequireAuthRaw from '../components/RequireAuth.tsx?raw';
import BadgeRaw from '../components/ui/Badge.tsx?raw';
import LoadingRaw from '../components/ui/Loading.tsx?raw';
import ToastRaw from '../components/ui/Toast.tsx?raw';

import AuthContextRaw from '../context/AuthContext.tsx?raw';

import apiRaw from '../lib/api.ts?raw';
import classificationRaw from '../lib/classification.ts?raw';
import dbRaw from '../lib/db.ts?raw';
import priorityRaw from '../lib/priority.ts?raw';
import routingRaw from '../lib/routing.ts?raw';
import testsRaw from '../lib/tests.ts?raw';
import typesRaw from '../lib/types.ts?raw';
import validationRaw from '../lib/validation.ts?raw';

import AnalyticsRaw from '../pages/Analytics.tsx?raw';
import HandlerDashboardRaw from '../pages/HandlerDashboard.tsx?raw';
import LoginRaw from '../pages/Login.tsx?raw';
import RoutingDashboardRaw from '../pages/RoutingDashboard.tsx?raw';
import SubmitReportRaw from '../pages/SubmitReport.tsx?raw';
import TestsRaw from '../pages/Tests.tsx?raw';
import UserDashboardRaw from '../pages/UserDashboard.tsx?raw';

// Config files (root)
import packageJsonRaw from '../../package.json?raw';
import viteConfigRaw from '../../vite.config.ts?raw';
import tailwindConfigRaw from '../../tailwind.config.js?raw';
import postcssConfigRaw from '../../postcss.config.js?raw';
import tsconfigRaw from '../../tsconfig.json?raw';
import tsconfigAppRaw from '../../tsconfig.app.json?raw';
import tsconfigNodeRaw from '../../tsconfig.node.json?raw';
import eslintConfigRaw from '../../eslint.config.js?raw';
import indexHtmlRaw from '../../index.html?raw';
import gitignoreRaw from '../../.gitignore?raw';
import readmeRaw from '../../README.md?raw';

export interface ProjectFile {
  path: string;
  content: string;
}

export const PROJECT_FILES: ProjectFile[] = [
  { path: 'package.json', content: packageJsonRaw },
  { path: 'vite.config.ts', content: viteConfigRaw },
  { path: 'tailwind.config.js', content: tailwindConfigRaw },
  { path: 'postcss.config.js', content: postcssConfigRaw },
  { path: 'tsconfig.json', content: tsconfigRaw },
  { path: 'tsconfig.app.json', content: tsconfigAppRaw },
  { path: 'tsconfig.node.json', content: tsconfigNodeRaw },
  { path: 'eslint.config.js', content: eslintConfigRaw },
  { path: 'index.html', content: indexHtmlRaw },
  { path: '.gitignore', content: gitignoreRaw },
  { path: 'README.md', content: readmeRaw },

  { path: 'src/App.tsx', content: AppRaw },
  { path: 'src/main.tsx', content: mainRaw },
  { path: 'src/index.css', content: indexCssRaw },
  { path: 'src/vite-env.d.ts', content: viteEnvRaw },

  { path: 'src/components/Layout.tsx', content: LayoutRaw },
  { path: 'src/components/RequireAuth.tsx', content: RequireAuthRaw },
  { path: 'src/components/ui/Badge.tsx', content: BadgeRaw },
  { path: 'src/components/ui/Loading.tsx', content: LoadingRaw },
  { path: 'src/components/ui/Toast.tsx', content: ToastRaw },

  { path: 'src/context/AuthContext.tsx', content: AuthContextRaw },

  { path: 'src/lib/api.ts', content: apiRaw },
  { path: 'src/lib/classification.ts', content: classificationRaw },
  { path: 'src/lib/db.ts', content: dbRaw },
  { path: 'src/lib/priority.ts', content: priorityRaw },
  { path: 'src/lib/routing.ts', content: routingRaw },
  { path: 'src/lib/tests.ts', content: testsRaw },
  { path: 'src/lib/types.ts', content: typesRaw },
  { path: 'src/lib/validation.ts', content: validationRaw },

  { path: 'src/pages/Analytics.tsx', content: AnalyticsRaw },
  { path: 'src/pages/HandlerDashboard.tsx', content: HandlerDashboardRaw },
  { path: 'src/pages/Login.tsx', content: LoginRaw },
  { path: 'src/pages/RoutingDashboard.tsx', content: RoutingDashboardRaw },
  { path: 'src/pages/SubmitReport.tsx', content: SubmitReportRaw },
  { path: 'src/pages/Tests.tsx', content: TestsRaw },
  { path: 'src/pages/UserDashboard.tsx', content: UserDashboardRaw },
];
