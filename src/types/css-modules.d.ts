declare module '*.module.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
