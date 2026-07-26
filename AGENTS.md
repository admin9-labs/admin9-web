# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Admin9 Pro is an enterprise admin management system built with Vue 3, TypeScript, Vite, and Arco Design Pro. The application uses Laravel administrator JWT authentication and provides a comprehensive admin interface with internationalization support.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type:check

# Linting and formatting
npm run lint:fix          # Fix ESLint issues
npm run format            # Format with Prettier and fix linting

# Preview production build
npm run preview

# Generate bundle analysis report
npm run report

# Generate new components/pages using plop
npm run new
```

## Architecture

### Authentication System

The application uses Laravel administrator JWT authentication through `/api/admin/auth/*`.

Authentication flow is managed in `src/store/modules/user/index.ts`:
- `login()`: Traditional login
- `refreshSession()`: JWT refresh and identity update
- `logout()`: Server logout followed by local session cleanup
- Token storage uses localStorage via `src/utils/auth.ts`

### API Layer

All API requests go through axios interceptors (`src/api/interceptor.ts`):
- **Request interceptor**: Adds `Bearer` token to Authorization header, transforms pagination params (`current` → `page`, `pageSize` → `page_size`)
- **Response interceptor**: Handles numeric HTTP/business codes, preserves validation details, and only clears terminal sessions
- **Base URL**: Configured via `VITE_API_BASE_URL` environment variable

API response format:
```typescript
{
  success: boolean;
  message: string;
  code: number;  // 0 = success
  data: T;
  request_id: string;
}
```

### Routing System

Routes are organized in `src/router/routes/`:
- `modules/*.ts`: Internal application routes (auto-imported)
- `externalModules/*.ts`: External link routes (auto-imported)
- `base.ts`: Base routes (login, 404, etc.)

Route guards (`src/router/guard/`):
- Permission-based routing with role checks
- Server-side menu configuration support (`menuFromServer` flag in app store)
- White-listed routes bypass authentication

### State Management

Uses Pinia with persistence (`pinia-plugin-persistedstate`):
- `useUserStore`: User authentication and profile
- `useAppStore`: Application settings, theme, menu configuration
- `useTabBarStore`: Tab navigation state

### Component Structure

- **Layout Components**: `src/layout/` (default-layout, page-layout)
- **Global Components**: Auto-registered via `src/components/index.ts`
- **Arco Design**: Components auto-imported via `unplugin-vue-components`

### Internationalization

- Uses `vue-i18n` with locale files in `src/locale/`
- Supports `zh-CN` and `en-US`
- Component-level locale files follow pattern: `src/views/{module}/locale/{lang}.ts`

### Build Configuration

Vite configuration split across:
- `config/vite.config.base.ts`: Base config with plugins and aliases
- `config/vite.config.dev.ts`: Development server config
- `config/vite.config.prod.ts`: Production build config

Path aliases:
- `@/*` → `src/*`
- `assets/*` → `src/assets/*`

## Code Provenance and Ownership Boundaries

Before developing, refactoring, migrating, extracting, or deleting code, verify its provenance and ownership from evidence. Do not classify code solely from its directory, file name, an existing description, a desired target architecture, or an unsupported assertion that it is official upstream code, including such an assertion from the user.

Use the current implementation, Git history and commit provenance, project documentation, and, when necessary, a comparison with the matching version of the Arco Design Pro upstream source. If ownership still cannot be established, mark it as **ownership unconfirmed**, preserve the current implementation by default, and do not perform an architectural migration or rewrite.

Apply these four ownership layers:

1. **Arco upstream inheritance layer**: Foundation capabilities confirmed to come from the official template. Do not modify, migrate, or replace them with custom implementations unless the task requires it and the evidence supports the change.
2. **Project shared layer**: Capabilities created by this project and reused by multiple application pages. `Grid`, `GridToolbar`, and `GridTable` are project additions, not part of the Arco official baseline. They may evolve or become extraction candidates, but reuse alone does not justify moving them into a package.
3. **Component package layer**: `packages/admin9-ui` contains components, interactions, and interface contracts that explicitly target cross-project reuse and remain backend-agnostic. Do not put concrete API URLs, authentication behavior, stores, routes, or application business fields in the package.
4. **Application business layer**: Application-specific pages, APIs, stores, permissions, routes, business fields, and service adapters under `src` remain owned by the current application.

At the current stage, `admin9-ui` is an internal package incubated with this project. Prioritize integration with real APIs and serving this application. The near-term focus is integrating real APIs and validating the package, not preparing an npm release. Consider an npm release only after the application has been formally released and the package has been validated as stable; do not prematurely narrow its public API, remove existing capabilities, or drive broad migrations to meet a near-term package release goal.

`useLoading` and `useVisible` are existing capabilities inherited from the Arco project. Leave them in place unless a concrete requirement justifies a change, and do not migrate host code merely for package purity. Treat the `Grid` family as project shared code according to the boundary above.

The governing sequence is: **confirm provenance and ownership first, then decide where a change belongs**. Never classify code from the desired architecture first and then use that classification to justify its migration.

## Code Quality

- **ESLint**: Airbnb base + Vue 3 + TypeScript rules
- **Prettier**: Code formatting (integrated with ESLint)
- **Stylelint**: CSS/Less linting with rational order
- **Commitlint**: Conventional commits enforced via husky
- **Lint-staged**: Pre-commit hooks for auto-formatting

## Environment Variables

Configure in `.env.development` or `.env.production`:
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_QQ_MAP_KEY`: Tencent Map API key (for map components)

## Important Patterns

### Adding New Routes

1. Create route file in `src/router/routes/modules/{name}.ts`
2. Export route configuration (auto-imported)
3. Add corresponding view in `src/views/{name}/`
4. Add locale files if needed: `src/views/{name}/locale/`

### API Integration

1. Define API functions in `src/api/{module}.ts`
2. Use TypeScript interfaces for request/response types
3. Interceptors handle authentication and error display automatically
4. Pagination params are auto-transformed (current/pageSize → page/page_size)

### Permission Control

- Use `v-permission` directive for element-level permissions
- Route-level permissions via `meta.roles` in route config
- Permission logic in `src/hooks/permission.ts`

## Notes

- The application expects a Laravel-style backend API (based on pagination param transformation)
- Menu configuration can be loaded from server or defined locally (controlled by `menuFromServer` flag)
