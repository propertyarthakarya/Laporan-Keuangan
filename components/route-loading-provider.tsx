"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Image from "next/image";
import loadingGif from "@/app/img/Gift.gif";

const LoadingContext = createContext({
  isLoading: false,
  start: () => {},
});

export function RouteLoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setIsLoading(false);
  }, [pathname, searchParams]);

  const start = () => setIsLoading(true);

  return (
    <LoadingContext.Provider value={{ isLoading, start }}>
      {isLoading && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <Image
            src={loadingGif}
            alt="Loading..."
            width={80}
            height={80}
            unoptimized
          />
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export const useRouteLoading = () => useContext(LoadingContext);