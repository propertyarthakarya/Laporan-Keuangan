import Image from "next/image";
import loadingGif from "@/app/img/Gift.gif";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center py-20">
      <Image src={loadingGif} alt="Loading..." width={64} height={64} unoptimized priority />
    </div>
  );
}