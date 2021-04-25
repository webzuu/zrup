/**
 * A function type that internally represents a {@link RuleBuilder.definer rule definer} callback with the
 * `api` parameter pre-bound.
 */
export type boundDefiner = (...args: any[]) => void;
