"use client";

import { useEffect, useLayoutEffect } from "react";

// useLayoutEffect warns when it runs during SSR; picking useEffect there (it
// never runs during the server render itself either way) silences that while
// still getting a pre-paint sync on the client.
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
