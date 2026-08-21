# Copilot Instructions for Playwright API Testing Framework

## Project Overview
This is a Playwright-based API testing framework designed for testing REST APIs with features including custom matchers, schema validation and authentication handling.

## Key Technologies & Dependencies
- **Playwright Test**: Main testing framework (`@playwright/test`)
- **TypeScript**: Primary language
- **AJV**: JSON schema validation (`ajv`, `ajv-formats`)
- **Genson-JS**: Automatic schema generation (`genson-js`)

## Project Structure

```
├── api-test.config.ts      # Environment configuration
├── helpers/                # Utility helper functions
│   └── createToken.ts      # Authentication token creation
├── request-objects/        # JSON objects for API requests
│   └── [endpoint]/         # Organized by API endpoint
├── response-schemas/       # JSON schemas for API response validation
│   └── [endpoint]/         # Organized by API endpoint
├── tests/                  # Tests folder
│   └── *.spec.ts           # Test files
└── utils/                  # Core utilities
    ├── custom-expect.ts    # Custom Playwright matchers
    ├── fixtures.ts         # Test fixtures and setup
    ├── logger.ts           # API request/response logging
    ├── request-handler.ts  # Fluent API request builder
    └── schema-validator.ts # JSON schema validation logic
```

## Core Patterns & Conventions

### 1. Request Handler Pattern
The `RequestHandler` class provides a fluent API for building HTTP requests:

```typescript
// Standard pattern for API calls
const response = await api
    .path('/endpoint')
    .body({ data: 'value' })
    .headers({ 'Custom-Header': 'value' })
    .params({ limit: 10 })
    .postRequest(201)
```

**Key methods:**
- `.path(string)` - Set API endpoint path
- `.body(object)` - Set request body
- `.headers(object)` - Set custom headers
- `.params(object)` - Set query parameters
- `.url(string)` - Override base URL
- `.clearAuth()` - Remove authentication
- `.getRequest(expectedStatus)` - Execute GET
- `.postRequest(expectedStatus)` - Execute POST
- `.putRequest(expectedStatus)` - Execute PUT
- `.deleteRequest(expectedStatus)` - Execute DELETE

### 2. Custom Expect Matchers
Use custom matchers for assertions.

Examples:
```typescript
// Schema validation
await expect(response).shouldMatchSchema('articles', 'GET_articles')

// Value comparison with API logging
expect(response.title).shouldEqual('Expected Title')
expect(response.count).shouldBeLessThanOrEqual(100)
```

### 3. Test Structure Pattern
```typescript
import { test } from '../utils/fixtures';
import { expect } from '../utils/custom-expect';

test('Test Description', async ({ api }) => {
    // Test implementation using the api fixture
});
```

### 4. Authentication Pattern
- Authentication token is automatically created as a worker-scoped fixture
- Token is included in all requests by default
- Use `.clearAuth()` to remove authentication for specific requests

### 5. Variable Naming & Conditional Rules
- Always declare conditional logic in a new descriptive variable before using it in an `if` statement
- Use meaningful variable names that clearly describe the condition or intent
- Prefer boolean names that read naturally, such as `is_data_product_exist`, `has_valid_token`, `should_retry_request`
- Avoid short or unclear names like `flag`, `check`, `value`, or `result` unless they are truly obvious in context

Example:
```typescript
const is_data_product_exist = dataArrayProduct.length > 0

if (is_data_product_exist) {
    // logic here
}
```

### 6. Schema Validation Pattern
- Schema files are generated automatically when they do not exist
- Schemas are stored in the `response-schemas` folder
- `shouldMatchSchema(dirName, fileName)` is used for schema validation
- The optional third argument is only needed when you intentionally want to regenerate or refresh an existing schema from the latest response payload
- Example: `await expect(response).shouldMatchSchema('articles', 'GET_articles')`

## Common Development Patterns

### When Creating New Tests
- Import test fixture and custom expect
- Use the `api` fixture for requests
- Validate every reponse with schema matching
- Use custom matchers for assertions
- Single test can have a sequence of several API requests
- Use camel case for constant names
- Assign API response to the constant
- Do not assign response for `deleteRequest()`

### When creating POST or PUT requests
- Save request objects into [request-objects](../request-objects) folder
- Request object file naming pattern `[method]-[endpoint].json`
- Import request object file into the test. Example: `import articleRequestPayload from '../request-objects/POST-article.json'`
- Create a clone of imported request object for every test that needs it using `structuredClone()`. Example: `const articleRequest = structuredClone(articleRequestPayload)`
- Use request object file as argument in `body()` methods. Example: `.body(articleRequest)`

## Example Test Template

```typescript
import { test } from '../utils/fixtures';
import { expect } from '../utils/custom-expect';

test('Example API Test', async ({ api }) => {
    const createResponse = await api
        .path('/resource')
        .body({ name: 'Test Resource' })
        .postRequest(201)
    await expect(createResponse).shouldMatchSchema('resource', 'POST_resource')
    expect(createResponse.name).shouldEqual('Test Resource')
    
    const getResponse = await api
        .path('/resource')
        .params({ id: createResponse.id })
        .getRequest(200)
    await expect(getResponse).shouldMatchSchema('resource', 'GET_resource')
    
    await api
        .path(`/resource/${createResponse.id}`)
        .deleteRequest(204)
});
```