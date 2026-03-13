export type NotionLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateNotionLinkInput = {
  title: string;
  description: string;
  url: string;
  category: string;
  active?: boolean;
};

export type UpdateNotionLinkInput = Partial<CreateNotionLinkInput>;
