# Shared Package Import Example

A service imports shared types and validators using workspace package names:

```ts
import type { APIResponse, User, Vital } from "@prevntiv/shared-types";
import { CreateVitalSchema } from "@prevntiv/validators";

export const validateVitalPayload = (payload: unknown): APIResponse<Vital | null> => {
  const parsed = CreateVitalSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.issues.map((issue) => issue.message).join(", ")
    };
  }

  return {
    success: true,
    data: {
      id: "11111111-1111-1111-1111-111111111111",
      patientId: "00000000-0000-0000-0000-000000000000",
      type: parsed.data.type,
      value: parsed.data.value,
      source: parsed.data.source,
      timestamp: parsed.data.timestamp,
      isAnomaly: false
    }
  };
};
```
