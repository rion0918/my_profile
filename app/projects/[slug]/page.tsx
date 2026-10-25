import { notFound } from "next/navigation";
import { products } from "../../../lib/products";
import { ProductContent } from "../../../components/ProductContent";
import { ModeBar } from "../../../components/ModeBar";
export const dynamicParams = false;
export function generateStaticParams() {
  return products.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  return {
    title: `${product?.name ?? "作品"} | 橋本怜苑`,
    description: product?.summary,
    openGraph: {
      title: `${product?.name} | 橋本怜苑`,
      description: product?.summary,
    },
  };
}
export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  return (
    <>
      <ModeBar mode="profile" />
      <main className="detailPage">
        <a className="textLink" href="/profile#products">
          ← 作品一覧
        </a>
        <h1>{product.name}</h1>
        <ProductContent product={product} />
      </main>
    </>
  );
}
