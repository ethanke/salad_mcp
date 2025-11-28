# Contributing to Salad MCP Server

Thank you for your interest in contributing to the Salad MCP Server!

## Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd salad_mcp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. Build the project:
   ```bash
   npm run build
   ```

## Running Tests

### Integration Tests
```bash
npm test
```

### Auto-Eval with LLM Judge
```bash
npm run eval
```

## Development Workflow

1. Make your changes in the `src/` directory
2. Build: `npm run build`
3. Test locally: `npm test`
4. Run auto-eval: `npm run eval`
5. Commit and push your changes
6. Create a pull request

## Code Structure

- `src/salad-client.ts` - SaladCloud API client wrapper
- `src/index.ts` - MCP server implementation with tools
- `src/eval-cli.ts` - Auto-evaluation CLI with LLM-as-judge
- `src/integration-test.ts` - Integration test suite

## Adding New Tools

When adding new MCP tools:

1. Add the API method to `SaladClient` in `src/salad-client.ts`
2. Define the tool schema in `TOOLS` array in `src/index.ts`
3. Implement the tool handler in the switch statement
4. Add integration tests in `src/integration-test.ts`
5. Update the README with the new tool documentation

## Testing

All tests must pass before merging:
- ✅ Build succeeds
- ✅ Integration tests pass
- ✅ Auto-eval with LLM judge passes

## Questions?

Open an issue or reach out to the maintainers.
