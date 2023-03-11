import { Handler } from "@yandex-cloud/function-types";

export const handler: Handler.Http = async (event, context) => {
	// do something
	return {
		statusCode: 200,
		body: "Hello world!",
	};
};
