import type { PropsWithChildren } from 'react';
import React from 'react';
import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';

export default function RootHtml({ children }: PropsWithChildren) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();
  return (
    <html {...htmlAttributes} lang="en">
      <head>
        {headNodes}
        <meta name="theme-color" content="#208AEF" />
        <meta
          name="description"
          content="Generate transparent AI stickers locally in your browser."
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <ScrollViewStyleReset />
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
