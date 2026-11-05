declare module "*.JPG" {
  const image: import("astro").ImageMetadata;
  export default image;
}
