## **HTTP Requests**
Always use Axios for making HTTP requests.
Do not use fetch or other libraries unless explicitly instructed.
Axios requests should handle errors gracefully with try/catch or Axios interceptors.

## **Data Fetching / State Management**
Always use TanStack Query for fetching, caching, and mutating data.

Use useQuery for GET requests and useMutation for POST, PATCH, or DELETE operations.

Do not manually manage loading/error states outside of TanStack Query unless necessary.

Use Optimistic Updates with mutations.

## API Routes vs Server Actions

For GET, API routes in /api are allowed.

For POST, PATCH, PUT, DELETE requests:

Do not put them in API routes.

Instead, implement as server actions in the lib directory.

Server actions should be callable directly from the frontend with TanStack Query mutations.

Ensure server actions are type-safe and validate inputs.

## **TypeScript Guidelines**

Never use the any type.

Always keep code fully type-safe.

Define proper interfaces/types for API responses, inputs, and server actions.

Prefer generics in TanStack Query for strongly-typed queries and mutations.