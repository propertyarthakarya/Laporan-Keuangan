'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      'relative flex w-full touch-none select-none items-center',
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary dark:border dark:border-white/10 dark:bg-white/[0.06] dark:[backdrop-filter:blur(12px)_saturate(160%)]">
      <SliderPrimitive.Range className="absolute h-full bg-primary dark:bg-white/80 dark:shadow-[0_0_16px_rgba(255,255,255,0.5)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className={cn(
        'block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        // Glass thumb — cuma dark mode: border terang, isi semi-transparan, blur + glow tipis
        // biar kerasa kayak bola kaca yang kena cahaya, bukan lingkaran solid biasa.
        'dark:border-white/40 dark:bg-white/20 dark:[backdrop-filter:blur(8px)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_4px_16px_-2px_rgba(0,0,0,0.5),inset_0_1px_0_0_rgba(255,255,255,0.4)]',
      )}
    />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };