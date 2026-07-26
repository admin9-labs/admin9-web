# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
