interface ServiceWorkerMigration {
  id: string;
  run: () => Promise<void>;
}

export { type ServiceWorkerMigration };
