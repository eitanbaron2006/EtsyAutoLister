// Shared domain types for the AutoLister listing pipeline.

export type ListingMetadata = {
  id: string;
  folderName: string;
  projectId?: string; // all listings created in one staging-tray batch share this
  projectName?: string;
  title?: string;
  description?: string;
  price?: number;
  tags?: string[];
  status: 'idle' | 'scanning' | 'mockups' | 'thumbnail' | 'compiling' | 'seo' | 'ready' | 'publishing' | 'published';
  listingId?: string;
  listingUrl?: string;
  productType?: string; // 'png_graphics' | 'printable_wallart' | 'presets' | 'planners'
  pipelineStepText?: string;
  mockupImage?: string; // Legacy saved preview from older drafts.
  mockupNote?: string | null; // admin note: not enough suitable templates on the render server
  // Which templates were picked by hand for this listing, and which source
  // sits in which frame of a multi-frame mockup. Session state until now, so a
  // refresh threw away work that had been done listing by listing.
  studioPrefs?: { templateIds: string[]; assignments: Record<number, string>; printSetId?: number | null };
  updatedAt?: string; // ISO timestamp, maintained by the DB trigger; used to detect stalled pipeline runs
  // What the render server said about handing these files over. Kept with the
  // listing because it cannot be recomputed: only the pack knows the totals,
  // and without it a reload cannot tell an oversize listing from any other.
  printDelivery?: {
    mode: 'files' | 'archives' | 'oversize';
    note?: string;
    totalBytes?: number;
    allowanceBytes?: number;
  } | null;
  // Where these files actually ended up, once they were delivered. Written by
  // the server, which is the only side that ever talks to Drive, and read here
  // so a reopened draft can show the folder instead of offering to make it
  // again.
  delivery?: {
    provider: 'drive';
    folderId?: string;
    url: string;
    fileCount?: number;
    bytes?: number;
    deliveredAt?: string;
  } | null;
  quantity?: number;
  listingType?: string;
  renewalOption?: string;
  whoMade?: string;
  whenMade?: string;
  category?: string;
  shippingProfile?: string;
  isSupply?: boolean;
  sku?: string;
  primaryColor?: string;
  secondaryColor?: string;
  occasion?: string;
  holiday?: string;
  personalizationEnabled?: boolean;
  personalizationInstructions?: string;
  materials?: string;
  productionPartners?: string;
};

// Extends ListingMetadata with in-memory selected Files during active sessions
export type ProductData = ListingMetadata & {
  images: File[];
  files: File[];
};

// A product being assembled in the staging tray before creation. Singles and
// sets coexist in one batch — every staged entry becomes its own listing.
export type StagedImage = { id: string; file: File; url: string };
export type StagedProduct = {
  id: string;
  name: string;
  kind: 'single' | 'set';
  images: StagedImage[];
  files: File[]; // non-image deliverables (PDF/ZIP) attached to this product
};

// A mockup rendered by the local MockupGen server, downloaded into browser
// memory (the server's outputs folder is not guaranteed to persist).
export type GeneratedMockup = {
  id: string;
  templateId: string;
  sourceFileNames: string[]; // the uploaded artwork(s) rendered into this mockup
  frameAssignment?: string[]; // frameAssignment[i] = artwork file name placed in frame i+1
  file: File;
  url: string; // object URL for in-app display
};
