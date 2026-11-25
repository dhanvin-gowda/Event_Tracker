export type ExtractedEvent = {
  sourceUrl: string;
  title: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

export type SavedEvent = ExtractedEvent & {
  id: string;
  userId: string;
  createdAt: string;
};
