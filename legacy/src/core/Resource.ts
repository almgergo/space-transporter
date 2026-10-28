export const RESOURCES = ['ore', 'metal', 'food'] as const;

export type Resource = (typeof RESOURCES)[number];

/** A partial mapping of resources to amounts, e.g. a recipe's inputs. */
export type ResourceAmounts = Partial<Record<Resource, number>>;
