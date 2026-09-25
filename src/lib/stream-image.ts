import { createParser } from "eventsource-parser";
import { flushSync } from "react-dom";

type ImagePayload = { type?: string; b64_json?: string; error?: { message?: string } };

export async function streamImage(
  endpoint: string,
  input: FormData,
  onFrame: (dataUrl: string, isFinal: boolean) => void,
): Promise<void> {
  const send = (stream: boolean) => {
    const form = new FormData();
    input.forEach((value, name) => form.append(name, value));
    form.set("stream", String(stream));
    if (!stream) form.delete("partial_images");
    return fetch(endpoint, { method: "POST", body: form });
  };

  const response = await send(true);
  if (!response.ok || !response.body) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Try-on failed (${response.status})`);
  }

  let sawCompleted = false;
  let sawAnyEvent = false;
  let streamError: string | undefined;
  const parser = createParser({
    onEvent(event) {
      let payload: ImagePayload | undefined;
      try {
        payload = JSON.parse(event.data) as ImagePayload;
      } catch {
        payload = undefined;
      }
      if (event.event === "error" || payload?.type === "error") {
        sawAnyEvent = true;
        streamError = payload?.error?.message ?? "The virtual try-on could not be generated.";
        return;
      }
      const type = event.event || payload?.type;
      if (
        type !== "image_generation.partial_image" &&
        type !== "image_generation.completed" &&
        type !== "image_edit.partial_image" &&
        type !== "image_edit.completed"
      ) return;

      sawAnyEvent = true;
      if (!payload?.b64_json) {
        streamError = "The try-on preview did not contain an image.";
        return;
      }
      const isFinal = type === "image_generation.completed" || type === "image_edit.completed";
      flushSync(() => onFrame(`data:image/png;base64,${payload.b64_json}`, isFinal));
      if (isFinal) sawCompleted = true;
    },
  });

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  try {
    while (true) {
      let chunk: ReadableStreamReadResult<string>;
      try {
        chunk = await reader.read();
      } catch (error) {
        if (sawAnyEvent) throw error;
        break;
      }
      if (chunk.done) break;
      parser.feed(chunk.value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (streamError) throw new Error(streamError);
  if (!sawAnyEvent) {
    const replay = await send(false);
    if (!replay.ok) throw new Error((await replay.text().catch(() => "")) || "Try-on failed.");
    const json = (await replay.json()) as { data?: { b64_json?: string }[] };
    const image = json.data?.[0]?.b64_json;
    if (!image) throw new Error("The virtual try-on returned no image.");
    onFrame(`data:image/png;base64,${image}`, true);
    return;
  }
  if (!sawCompleted) throw new Error("The virtual try-on ended before the final image was ready.");
}