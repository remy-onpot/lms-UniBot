"use client";

import React from 'react';
import { FaceProvider } from './FaceProvider';

export default function FaceProviderClient({ children }: { children: React.ReactNode }) {
  return <FaceProvider>{children}</FaceProvider>;
}
