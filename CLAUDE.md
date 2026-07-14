## **HTTP Requests**

Always use Axios for making HTTP requests.
Do not use fetch or other libraries unless explicitly instructed.
Axios requests should handle errors gracefully with try/catch or Axios interceptors.

## **Data Fetching / State Management**

Always use TanStack Query for fetching, caching, and mutating data.

Use useQuery for GET requests and useMutation for POST, PATCH, or DELETE operations.

Do not manually manage loading/error states outside of TanStack Query unless necessary.

Use Optimistic Updates with mutations.

## **TypeScript Guidelines**

Never use the any type.

Always keep code fully type-safe.

Define proper interfaces/types for API responses, inputs, and server actions.

Prefer generics in TanStack Query for strongly-typed queries and mutations.

## **Testing Requirements**

Use Vitest for all testing.

Every new feature or code implementation must include corresponding unit tests.

Any modification to existing code must include:

Updated tests reflecting the change.

Adjustments to existing tests if behavior changes.

Tests must cover:

Success cases

Error cases

Edge cases where applicable

Do not merge or finalize code without passing tests.
