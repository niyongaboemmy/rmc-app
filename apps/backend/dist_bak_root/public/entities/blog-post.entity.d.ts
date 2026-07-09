export declare class BlogCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
}
export declare class BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    featuredImage: string | null;
    categoryId: string | null;
    category: BlogCategory | null;
    authorId: string;
    status: string;
    seoTitle: string | null;
    seoDescription: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
