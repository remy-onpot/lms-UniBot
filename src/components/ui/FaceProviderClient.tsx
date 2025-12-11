'use client';

import { FaceProvider } from './FaceProvider';

/**
 * Client Component Wrapper
 * Allows using the FaceContext in the Server Component RootLayout.
 * acts as a bridge between the Server and Client worlds.
 */
export default function FaceProviderClient({ children }: { children: React.ReactNode }) {
  return (
    <FaceProvider>
      {children}
    </FaceProvider>
  );
}