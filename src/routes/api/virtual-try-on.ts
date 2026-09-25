import { createFileRoute } from "@tanstack/react-router";
import { editImage, imageSettings } from "@/lib/image-gateway.server";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const VALID_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeMessage(status: number, raw: string) {
  try {
    const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string };
    return parsed.error?.message || parsed.message || `Try-on failed (${status}).`;
  } catch {
    return raw || `Try-on failed (${status}).`;
  }
}

export const Route = createFileRoute("/api/virtual-try-on")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return new Response("AI try-on is not configured.", { status: 503 });

        const incoming = await request.formData();
        const person = incoming.get("person");
        const productImage = incoming.get("productImage");
        const productName = incoming.get("productName");
        const stream = incoming.get("stream");

        if (!(person instanceof File) || !VALID_IMAGE_TYPES.has(person.type)) {
          return new Response("Choose a JPG, PNG, or WebP photo.", { status: 400 });
        }
        if (person.size > MAX_IMAGE_BYTES) {
          return new Response("Your photo must be smaller than 10 MB.", { status: 400 });
        }
        if (typeof productImage !== "string" || !productImage.trim()) {
          return new Response("Choose a shirt first.", { status: 400 });
        }

        let productUrl: URL;
        try {
          productUrl = new URL(productImage, request.url);
        } catch {
          return new Response("The selected shirt image is invalid.", { status: 400 });
        }
        const appHost = new URL(request.url).host;
        const backendUrl = process.env["SUPABASE_URL"];
        const allowedHosts = new Set([appHost]);
        if (backendUrl) allowedHosts.add(new URL(backendUrl).host);
        if (!allowedHosts.has(productUrl.host)) {
          return new Response("The selected shirt image is not from this shop.", { status: 400 });
        }

        const productResponse = await fetch(productUrl);
        if (!productResponse.ok) return new Response("The selected shirt image could not be loaded.", { status: 400 });
        const productType = productResponse.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
        if (!VALID_IMAGE_TYPES.has(productType)) return new Response("The selected product needs a valid image.", { status: 400 });
        const productBytes = await productResponse.arrayBuffer();
        if (productBytes.byteLength > MAX_IMAGE_BYTES) return new Response("The product image is too large.", { status: 400 });

        const form = new FormData();
        form.set(
          "prompt",
          `Create a photorealistic virtual clothing try-on. Reference image 1 is the customer: preserve their identity, face, hair, skin tone, body proportions, pose, hands, background, camera angle, and lighting exactly. Reference image 2 is the shop product ${typeof productName === "string" ? `called “${productName.slice(0, 80)}”` : ""}: replace only the customer's current upper-body garment with this exact t-shirt. Preserve the product's colour, fabric weight, neckline, sleeve length, cut, texture, seams, and any visible design. Fit it naturally to the customer's body with realistic folds, shadows, and occlusion. Do not change trousers, accessories, body shape, or surroundings. Return one vertical editorial photograph with no text, labels, collage, border, or extra people.`,
        );
        form.append("image[]", person, person.name || "customer.jpg");
        form.append("image[]", new File([productBytes], "product.jpg", { type: productType }));
        form.set("stream", stream === "false" ? "false" : "true");

        const upstream = await editImage({ ...imageSettings, apiKey }, form);
        if (!upstream.ok && !upstream.body) {
          const message = safeMessage(upstream.status, await upstream.text().catch(() => ""));
          return new Response(message, { status: upstream.status });
        }
        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});