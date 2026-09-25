import { useEffect, useMemo, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, Download, ImagePlus, LoaderCircle, Move, RefreshCw, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { productsQuery, type Product } from "@/lib/products";
import { streamImage } from "@/lib/stream-image";

type Mode = "live" | "photo";

export function VirtualTryOn() {
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const activeProducts = useMemo(() => products.filter((product) => product.is_active), [products]);
  const [selectedId, setSelectedId] = useState("");
  const selected = activeProducts.find((product) => product.id === selectedId) ?? activeProducts[0];

  useEffect(() => {
    if (!selectedId && activeProducts[0]) setSelectedId(activeProducts[0].id);
  }, [activeProducts, selectedId]);

  return (
    <section className="mt-24 border-y border-border py-16 md:py-24">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="label-xs text-muted-foreground">Virtual fitting studio</p>
            <h2 className="mt-4 max-w-3xl text-3xl font-semibold md:text-6xl">SEE IT ON YOU</h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground">
              Try a shirt instantly with your camera, or upload a front-facing photo for a more
              realistic fitted preview.
            </p>
          </div>
          <div className="label-xs border border-border px-4 py-3 text-muted-foreground">
            Photos are processed for this preview only
          </div>
        </div>

        {isLoading ? (
          <div className="mt-12 flex min-h-[520px] items-center justify-center border border-border bg-surface">
            <LoaderCircle className="size-5 animate-spin text-muted-foreground" aria-label="Loading shirts" />
          </div>
        ) : selected ? (
          <TryOnWorkspace products={activeProducts} selected={selected} onSelect={setSelectedId} />
        ) : (
          <div className="mt-12 border border-border bg-surface p-10 text-center text-muted-foreground">
            Add an active product with an image to use the fitting studio.
          </div>
        )}
      </div>
    </section>
  );
}

function TryOnWorkspace({
  products,
  selected,
  onSelect,
}: {
  products: Product[];
  selected: Product;
  onSelect: (id: string) => void;
}) {
  const [mode, setMode] = useState<Mode>("live");

  return (
    <div className="mt-12 grid gap-px bg-border lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 bg-background p-4 md:p-8">
        <div className="mb-5 flex w-full border border-border p-1 sm:w-fit" role="tablist" aria-label="Try-on mode">
          <Button
            type="button"
            variant={mode === "live" ? "default" : "ghost"}
            className="flex-1 rounded-none sm:flex-none"
            onClick={() => setMode("live")}
            role="tab"
            aria-selected={mode === "live"}
          >
            <Camera /> Live camera
          </Button>
          <Button
            type="button"
            variant={mode === "photo" ? "default" : "ghost"}
            className="flex-1 rounded-none sm:flex-none"
            onClick={() => setMode("photo")}
            role="tab"
            aria-selected={mode === "photo"}
          >
            <Sparkles /> AI photo
          </Button>
        </div>
        {mode === "live" ? <LiveCamera selected={selected} /> : <PhotoTryOn selected={selected} />}
      </div>

      <aside className="bg-surface p-5 md:p-7">
        <p className="label-xs text-muted-foreground">Choose a shirt</p>
        <div className="mt-5 grid max-h-[650px] grid-cols-2 gap-3 overflow-y-auto pr-1 lg:grid-cols-1">
          {products.map((product) => (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelect(product.id)}
              aria-pressed={product.id === selected.id}
              className={`grid overflow-hidden border text-left transition-colors lg:grid-cols-[84px_1fr] ${
                product.id === selected.id ? "border-foreground bg-background" : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="aspect-square overflow-hidden bg-muted lg:aspect-auto">
                <img src={product.image_url} alt="" className="size-full object-cover" />
              </div>
              <div className="min-w-0 p-3">
                <p className="truncate text-sm font-medium">{product.name}</p>
                <p className="label-xs mt-1 truncate text-muted-foreground">{product.category}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

function LiveCamera({ selected }: { selected: Product }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dragRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scale, setScale] = useState(48);
  const [opacity, setOpacity] = useState(78);
  const [position, setPosition] = useState({ x: 50, y: 48 });

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Live camera is not supported in this browser. Use the AI photo option instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError("Camera access was blocked. Allow camera permission, or use the AI photo option.");
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { ...position, startX: event.clientX, startY: event.clientY };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const parent = event.currentTarget.parentElement;
    if (!drag || !parent) return;
    const bounds = parent.getBoundingClientRect();
    setPosition({
      x: Math.max(12, Math.min(88, drag.x + ((event.clientX - drag.startX) / bounds.width) * 100)),
      y: Math.max(15, Math.min(85, drag.y + ((event.clientY - drag.startY) / bounds.height) * 100)),
    });
  };

  return (
    <div>
      <div className="relative mx-auto aspect-[3/4] max-h-[680px] w-full overflow-hidden bg-muted md:aspect-[4/3]">
        {cameraOn ? (
          <video ref={videoRef} muted playsInline className="size-full scale-x-[-1] object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <Camera className="size-10 text-muted-foreground" />
            <p className="mt-5 text-lg font-medium">Open your front camera</p>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Stand straight with your upper body visible. Your camera stays in this browser.
            </p>
            <Button type="button" size="lg" className="mt-6" onClick={startCamera}>
              <Camera /> Start camera
            </Button>
          </div>
        )}

        {cameraOn && (
          <div
            className="absolute cursor-move touch-none select-none"
            style={{ left: `${position.x}%`, top: `${position.y}%`, width: `${scale}%`, transform: "translate(-50%, -50%)" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => { dragRef.current = null; }}
          >
            <img
              src={selected.image_url}
              alt={`${selected.name} live fitting layer`}
              draggable={false}
              className="aspect-[4/5] w-full object-cover mix-blend-lighten"
              style={{ opacity: opacity / 100, clipPath: "polygon(27% 5%, 39% 0, 50% 8%, 61% 0, 73% 5%, 98% 28%, 82% 43%, 72% 32%, 76% 100%, 24% 100%, 28% 32%, 18% 43%, 2% 28%)" }}
            />
            <div className="pointer-events-none absolute left-1/2 top-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-foreground bg-background/70">
              <Move className="size-4" />
            </div>
          </div>
        )}
        <div className="film-grain pointer-events-none absolute inset-0" aria-hidden />
      </div>

      {cameraError && <p className="mt-4 text-sm text-destructive" role="alert">{cameraError}</p>}
      {cameraOn && (
        <div className="mt-5 grid gap-5 border border-border p-5 sm:grid-cols-2">
          <label className="text-sm">
            <span className="flex justify-between"><span>Shirt size</span><span className="font-mono text-muted-foreground">{scale}%</span></span>
            <input className="mt-3 w-full accent-current" type="range" min="28" max="78" value={scale} onChange={(event) => setScale(Number(event.target.value))} />
          </label>
          <label className="text-sm">
            <span className="flex justify-between"><span>Shirt visibility</span><span className="font-mono text-muted-foreground">{opacity}%</span></span>
            <input className="mt-3 w-full accent-current" type="range" min="35" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => setPosition({ x: 50, y: 48 })}><RefreshCw /> Reset position</Button>
            <Button type="button" variant="ghost" onClick={stopCamera}>Turn camera off</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PhotoTryOn({ selected }: { selected: Product }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [result, setResult] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    setResult("");
    setIsFinal(false);
  }, [selected.id]);

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    setError("");
    setResult("");
    setIsFinal(false);
    if (!next) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(next.type)) {
      setError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (next.size > 10 * 1024 * 1024) {
      setError("Choose an image smaller than 10 MB.");
      return;
    }
    setPhoto(next);
  };

  const generate = async () => {
    if (!photo) return;
    setLoading(true);
    setError("");
    setResult("");
    setIsFinal(false);
    const form = new FormData();
    form.append("person", photo);
    form.set("productImage", selected.image_url);
    form.set("productName", selected.name);
    try {
      await streamImage("/api/virtual-try-on", form, (image, final) => {
        setResult(image);
        setIsFinal(final);
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The virtual try-on could not be generated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={choosePhoto} />
      <div className="grid gap-px bg-border sm:grid-cols-2">
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {preview ? (
            <img src={preview} alt="Your uploaded fitting photo" className="size-full object-cover" />
          ) : (
            <button type="button" onClick={() => inputRef.current?.click()} className="absolute inset-0 flex size-full flex-col items-center justify-center px-6 text-center hover:bg-accent/30">
              <ImagePlus className="size-9 text-muted-foreground" />
              <span className="mt-4 text-sm font-medium">Add a front-facing photo</span>
              <span className="mt-2 text-xs text-muted-foreground">JPG, PNG or WebP · up to 10 MB</span>
            </button>
          )}
          <p className="label-xs absolute bottom-3 left-3 bg-background/80 px-2 py-1">Your photo</p>
        </div>
        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
          {result ? (
            <img src={result} alt={`AI preview wearing ${selected.name}`} className={`size-full object-cover transition-[filter] duration-500 ${isFinal ? "blur-0" : "blur-2xl"}`} />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              {loading ? <LoaderCircle className="size-9 animate-spin text-muted-foreground" /> : <Sparkles className="size-9 text-muted-foreground" />}
              <p className="mt-4 text-sm text-muted-foreground">{loading ? "Fitting the selected shirt…" : "Your fitted result appears here"}</p>
            </div>
          )}
          <p className="label-xs absolute bottom-3 left-3 bg-background/80 px-2 py-1">AI fitting</p>
        </div>
      </div>

      {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={loading}>
          <Upload /> {photo ? "Change photo" : "Choose photo"}
        </Button>
        <Button type="button" onClick={generate} disabled={!photo || loading}>
          {loading ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
          {result && isFinal ? "Generate again" : "Create realistic try-on"}
        </Button>
        {result && isFinal && (
          <Button asChild variant="ghost">
            <a href={result} download={`unlabelled-${selected.slug}-try-on.png`}><Download /> Download</a>
          </Button>
        )}
      </div>
      <p className="mt-4 max-w-2xl text-xs leading-relaxed text-muted-foreground">
        AI previews are an approximation of fit and colour. Check the product measurements before ordering.
      </p>
    </div>
  );
}