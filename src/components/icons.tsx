/**
 * The app's icons: Phosphor's duotone set, sized in px and coloured by
 * currentColor. Each one is imported from its own module, which keeps the
 * other fifteen hundred out of the bundle and works in server components.
 */
import type { Icon as PhosphorIcon } from "@phosphor-icons/react/dist/lib/types";
import { ArrowClockwiseIcon as ArrowClockwise } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { ArrowRightIcon as ArrowRight } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { BroomIcon as Broom } from "@phosphor-icons/react/dist/ssr/Broom";
import { CheckIcon as Check } from "@phosphor-icons/react/dist/ssr/Check";
import { CheckCircleIcon as CheckCircle } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { CopyIcon as Copy } from "@phosphor-icons/react/dist/ssr/Copy";
import { DownloadSimpleIcon as DownloadSimple } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { LightningIcon as Lightning } from "@phosphor-icons/react/dist/ssr/Lightning";
import { MoonIcon as Moon } from "@phosphor-icons/react/dist/ssr/Moon";
import { PaperPlaneTiltIcon as PaperPlaneTilt } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { PlusIcon as Plus } from "@phosphor-icons/react/dist/ssr/Plus";
import { QuestionIcon as Question } from "@phosphor-icons/react/dist/ssr/Question";
import { SparkleIcon as Sparkle } from "@phosphor-icons/react/dist/ssr/Sparkle";
import { SunIcon as Sun } from "@phosphor-icons/react/dist/ssr/Sun";
import { TerminalWindowIcon as TerminalWindow } from "@phosphor-icons/react/dist/ssr/TerminalWindow";
import { TextAlignLeftIcon as TextAlignLeft } from "@phosphor-icons/react/dist/ssr/TextAlignLeft";
import { TrashIcon as Trash } from "@phosphor-icons/react/dist/ssr/Trash";
import { UploadSimpleIcon as UploadSimple } from "@phosphor-icons/react/dist/ssr/UploadSimple";
import { XIcon as X } from "@phosphor-icons/react/dist/ssr/X";

type Props = { size?: number };

function duotone(Glyph: PhosphorIcon) {
  function Icon({ size = 18 }: Props) {
    return <Glyph size={size} weight="duotone" aria-hidden="true" style={{ display: "block", flex: "none" }} />;
  }
  return Icon;
}

export const ArrowClockwiseIcon = duotone(ArrowClockwise);
export const ArrowRightIcon = duotone(ArrowRight);
export const BroomIcon = duotone(Broom);
export const CheckIcon = duotone(Check);
export const CheckCircleIcon = duotone(CheckCircle);
export const CopyIcon = duotone(Copy);
export const DownloadIcon = duotone(DownloadSimple);
export const LightningIcon = duotone(Lightning);
export const MoonIcon = duotone(Moon);
export const PaperPlaneIcon = duotone(PaperPlaneTilt);
export const PlusIcon = duotone(Plus);
export const QuestionIcon = duotone(Question);
export const SparkleIcon = duotone(Sparkle);
export const SunIcon = duotone(Sun);
export const TerminalIcon = duotone(TerminalWindow);
export const TextAlignIcon = duotone(TextAlignLeft);
export const TrashIcon = duotone(Trash);
export const UploadIcon = duotone(UploadSimple);
export const XIcon = duotone(X);

/** The bird mark knocked out of an ink square, with the accent as its eye. */
/**
 * Without a size, the stylesheet sizes the square (the header's mark grows
 * and shrinks with the screen) and the bird fills two thirds of it.
 */
export function BrandMark({ box, glyph }: { box?: number; glyph?: number }) {
  return (
    <span className="ds-mark" style={box ? { width: box, height: box } : undefined}>
      <svg
        width={glyph ?? "65%"}
        height={glyph ?? "65%"}
        viewBox="0 0 24 24"
        aria-hidden="true"
        style={{ display: "block" }}
      >
        <path d="M3 5.5 L13.5 5.5 L21 12 L13.5 18.5 L3 18.5 L8.5 12 Z" fill="var(--color-bg)" />
        <path d="M10.6 12 L15 9.4 L15 14.6 Z" fill="var(--color-accent)" />
      </svg>
    </span>
  );
}
