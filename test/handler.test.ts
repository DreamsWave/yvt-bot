import { expect, test } from "vitest";

import { handler } from "../src/index";

test("should invoke handler function", async () => {
	const response = await handler({} as any, {} as any);
	expect(response.statusCode).toBe(200);
	expect(response.body).toBe("Hello world!");
});
