interface Window {
  DEBUG?: boolean;
  Ventrata?: ((config?: Record<string, unknown>, ...args: unknown[]) => unknown) & {
    __ventrataInjectorOriginal?: (config?: Record<string, unknown>, ...args: unknown[]) => unknown;
  };
  VentrataInjector?: {
    contentScriptInjected: boolean;
  };
}
