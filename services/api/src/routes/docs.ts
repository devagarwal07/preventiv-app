import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import openApiDocument from "../../docs/openapi.json" with { type: "json" };

export const docsRouter = Router();

if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DOCS === "true") {
    docsRouter.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
