export const noop = (): undefined => {}

if (process.env.NODE_ENV !== 'production') {
  noop.displayName = 'DefaultFallback'
}