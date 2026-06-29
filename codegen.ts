/**
 * OPTIONAL upgrade path: regenerate types from the real Flash schema instead of
 * maintaining src/flash/types.ts by hand.
 *
 *   npm i -D @graphql-codegen/cli @graphql-codegen/typescript
 *   npx graphql-codegen
 *
 * Uses the SDL captured in Phase 0 (schema/flash-schema.graphql). You can also point
 * `schema` at the live endpoint (introspection is enabled).
 */
import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./schema/flash-schema.graphql",
  generates: {
    "./src/flash/schema.generated.ts": {
      plugins: ["typescript"],
      config: { enumsAsTypes: true, scalars: { WalletId: "string", SatAmount: "number", AuthToken: "string" } },
    },
  },
};

export default config;
