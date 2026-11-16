import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { and, asc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";
import { placesQuerySchema, type PlaceDTO } from "@nzila/shared";
import { places } from "../../db/schema";

export const placesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.authenticate);

  app.get(
    "/",
    {
      config: { rateLimit: { max: 60, timeWindow: "1 minute" } },
      schema: {
        querystring: placesQuerySchema,
        tags: ["places"],
        summary: "Pontos úteis de Luanda",
        security: [{ bearer: [] }],
      },
    },
    async (req) => {
      const { category, q, minLat, minLng, maxLat, maxLng, limit } = req.query;

      const filters: SQL[] = [eq(places.published, true)];
      if (category) filters.push(eq(places.category, category));
      if (q) {
        const search = or(ilike(places.name, `%${q}%`), ilike(places.description, `%${q}%`));
        if (search) filters.push(search);
      }
      if (minLat !== undefined) filters.push(gte(places.lat, minLat));
      if (maxLat !== undefined) filters.push(lte(places.lat, maxLat));
      if (minLng !== undefined) filters.push(gte(places.lng, minLng));
      if (maxLng !== undefined) filters.push(lte(places.lng, maxLng));

      const rows = await app.db
        .select()
        .from(places)
        .where(and(...filters))
        .orderBy(asc(places.name))
        .limit(limit);

      const items: PlaceDTO[] = rows.map((place) => ({
        id: place.id,
        name: place.name,
        category: place.category,
        description: place.description,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
        phone: place.phone,
        googleMapsUrl: place.googleMapsUrl,
        published: place.published,
      }));

      return { items };
    },
  );
};
