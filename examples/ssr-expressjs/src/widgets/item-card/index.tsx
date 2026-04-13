import { Skeleton } from '@heroui/react';
import { Flame, Heart, MessageCircle, Star, TrendingDown } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';
import { cva, cx } from 'yummies/css';

type ItemCardTone = 'accent' | 'success' | 'warning' | 'neutral';

export interface ItemCardBadge {
  label: ReactNode;
  icon?: ReactNode;
  tone?: ItemCardTone;
}

export interface ItemCardMeta {
  label: ReactNode;
  icon?: ReactNode;
  tone?: Exclude<ItemCardTone, 'neutral'> | 'default';
}

export interface ItemCardProps {
  title?: ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  price?: ReactNode;
  className?: string;
  href?: string;
  badge?: ItemCardBadge | null;
  discount?: ReactNode;
  imageAspectRatio?: number | string;
  imageFit?: CSSProperties['objectFit'];
  imageOverlay?: ReactNode;
  isFavorite?: boolean;
  favoriteLabel?: string;
  onFavoriteClick?: () => void;
  originalPrice?: ReactNode;
  priceMeta?: ItemCardMeta | null;
  rating?: ReactNode;
  reviewsCount?: ReactNode;
  reviewsLabel?: ReactNode;
  activeSlide?: number;
  slidesCount?: number;
  titleLines?: number;
  loading?: boolean;
}

const badgeCx = cva(
  'inline-flex items-center gap-1.5 rounded-[14px] px-3 py-2 text-[13px] font-bold leading-none',
  {
    variants: {
      tone: {
        accent: 'bg-brand-accent text-white',
        success: 'bg-brand text-white',
        warning: 'bg-amber-500 text-white',
        neutral: 'bg-black/70 text-white',
      },
    },
    defaultVariants: {
      tone: 'accent',
    },
  },
);

const priceMetaClassName = cva(
  'mt-3 flex items-center gap-2 text-base font-medium',
  {
    variants: {
      tone: {
        default: 'text-slate-500',
        accent: 'text-brand-accent',
        success: 'text-brand',
        warning: 'text-amber-600',
      },
    },
    defaultVariants: {
      tone: 'default',
    },
  },
);

const renderBadge = (badge?: ItemCardBadge | null) => {
  if (!badge) {
    return null;
  }

  return (
    <div className={badgeCx({ tone: badge.tone ?? 'accent' })}>
      <span className="flex items-center justify-center">
        {badge.icon ?? <Flame className="size-4 fill-current" />}
      </span>
      <span>{badge.label}</span>
    </div>
  );
};

const renderDots = (slidesCount: number, activeSlide: number) => {
  if (slidesCount < 2) {
    return null;
  }

  return (
    <div
      aria-label={`Слайд ${activeSlide + 1} из ${slidesCount}`}
      className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"
    >
      <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-1">
        {Array.from({ length: slidesCount }, (_, index) => (
          <span
            key={index}
            className={cx(
              'block size-2 rounded-full transition-colors',
              index === activeSlide ? 'bg-[#005bff]' : 'bg-white/80',
            )}
          />
        ))}
      </div>
    </div>
  );
};

export const ItemCard = ({
  title,
  imageSrc,
  imageAlt = '',
  price,
  className,
  href,
  badge,
  discount,
  imageAspectRatio = 0.75,
  imageFit = 'cover',
  imageOverlay,
  isFavorite = false,
  favoriteLabel = isFavorite ? 'Убрать из избранного' : 'Добавить в избранное',
  onFavoriteClick,
  originalPrice,
  priceMeta,
  rating,
  reviewsCount,
  reviewsLabel = 'отзывов',
  activeSlide = 0,
  slidesCount = 0,
  titleLines = 2,
  loading = false,
}: ItemCardProps) => {
  const LinkTag = href ? 'a' : 'div';
  const hasImage = Boolean(imageSrc);
  const clampedActiveSlide =
    slidesCount > 0 ? Math.min(Math.max(activeSlide, 0), slidesCount - 1) : 0;

  const titleStyle = {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: titleLines,
    display: '-webkit-box',
    overflow: 'hidden',
  } satisfies CSSProperties;

  if (loading) {
    return (
      <article
        className={cx(
          'flex shrink-0 flex-col overflow-hidden rounded-[20px] bg-white p-2',
          className,
        )}
      >
        <div className="relative overflow-hidden rounded-[18px] bg-slate-100">
          <Skeleton
            className="h-full w-full rounded-[18px]"
            style={{ aspectRatio: imageAspectRatio }}
          />
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2 px-2 pt-2 pb-2">
          <Skeleton className="h-9 w-1/2 rounded-xl" />
          <Skeleton className="h-6 w-1/3 rounded-xl" />
          <Skeleton className="h-5 w-full rounded-xl" />
          <Skeleton className="h-5 w-4/5 rounded-xl" />
          <Skeleton className="mt-auto h-5 w-2/5 rounded-xl" />
        </div>
      </article>
    );
  }

  return (
    <article
      className={cx(
        'flex shrink-0 flex-col overflow-hidden rounded-[20px] bg-white p-2',
        className,
      )}
    >
      <div
        className="relative overflow-hidden rounded-[18px] bg-slate-100"
        style={{ aspectRatio: imageAspectRatio }}
      >
        <LinkTag
          {...(href ? { href } : {})}
          aria-label={typeof title === 'string' ? title : imageAlt}
          className="block h-full w-full"
        >
          {hasImage ? (
            <img
              alt={imageAlt}
              className="h-full w-full"
              src={imageSrc}
              style={{ objectFit: imageFit }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#f4f7fb_0%,#e9eef5_100%)] font-medium text-slate-400 text-sm">
              Нет изображения
            </div>
          )}
          {imageOverlay ? (
            <div className="pointer-events-none absolute inset-0">
              {imageOverlay}
            </div>
          ) : null}
        </LinkTag>

        <button
          aria-label={favoriteLabel}
          className={cx(
            'absolute top-3 right-3 z-10 inline-flex size-10 items-center justify-center rounded-full border-[3px] bg-white text-black transition-transform hover:scale-105',
            isFavorite ? 'border-brand-accent' : 'border-transparent',
          )}
          onClick={onFavoriteClick}
          type="button"
        >
          <Heart
            className={cx(
              'size-6',
              isFavorite && 'fill-brand-accent text-brand-accent',
            )}
          />
        </button>

        {badge ? (
          <div className="absolute bottom-3 left-3 z-10">
            {renderBadge(badge)}
          </div>
        ) : null}
        {renderDots(slidesCount, clampedActiveSlide)}
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-2 pt-2 pb-2">
        <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
          <span className="font-extrabold text-[28px] text-brand-accent leading-none tracking-[-0.02em]">
            {price}
          </span>
          {originalPrice ? (
            <span className="font-semibold text-[18px] text-slate-400 leading-none line-through">
              {originalPrice}
            </span>
          ) : null}
          {discount ? (
            <span className="font-bold text-[18px] text-brand-accent leading-none">
              {discount}
            </span>
          ) : null}
        </div>

        {priceMeta ? (
          <div
            className={priceMetaClassName({
              tone: priceMeta.tone ?? 'default',
            })}
          >
            <span className="flex items-center justify-center">
              {priceMeta.icon ?? <TrendingDown className="size-4" />}
            </span>
            <span>{priceMeta.label}</span>
          </div>
        ) : null}

        <LinkTag
          {...(href ? { href } : {})}
          className="mt-1.5 block shrink-0 font-normal text-[16px] text-slate-900 leading-5 no-underline"
          style={titleStyle}
        >
          {title}
        </LinkTag>

        {rating || reviewsCount ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[16px] text-slate-500 leading-none">
            {rating ? (
              <span className="flex items-center gap-1.5 font-semibold text-slate-900">
                <Star className="size-4 fill-[#ff9e00] text-[#ff9e00]" />
                <span>{rating}</span>
              </span>
            ) : null}

            {reviewsCount ? (
              <span className="flex items-center gap-1.5">
                <MessageCircle className="size-4 fill-slate-300 text-slate-300" />
                <span>
                  {reviewsCount}
                  {reviewsLabel ? ` ${reviewsLabel}` : ''}
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
};
