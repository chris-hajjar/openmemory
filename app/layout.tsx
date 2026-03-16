export const metadata = {
  title: "OpenMemory",
  description: "Personal memory server for MCP clients",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
