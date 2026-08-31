export type Category =
  "Everything" | "News" | "Guides" | "Company" | "Engineering";

export interface ContentBlock {
  type: "paragraph" | "heading" | "subheading" | "list" | "quote" | "code";
  text?: string;
  items?: string[];
}

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: Exclude<Category, "Everything">;
  author: string;
  authorRole: string;
  date: string;
  readTime: string;
  image?: string;
  featured?: boolean;
  content: ContentBlock[];
}

export const categoryColors: Record<Exclude<Category, "Everything">, string> = {
  News: "bg-blue-100 text-blue-700",
  Guides: "bg-green-100 text-green-700",
  Company: "bg-purple-100 text-purple-700",
  Engineering: "bg-orange-100 text-orange-700",
};

export const posts: BlogPost[] = [];
