import type { IInventoryLot } from "../../../domain/index.js";

const startOfDay = (date: Date): Date => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);
  return normalizedDate;
};

const toComparableDate = (date: Date | null): number => {
  if (!date) {
    return Number.POSITIVE_INFINITY;
  }

  return new Date(date).getTime();
};

export const isExpiredLot = (
  lot: IInventoryLot,
  referenceDate = new Date(),
): boolean => {
  if (!lot.expiration_date) {
    return false;
  }

  return (
    startOfDay(new Date(lot.expiration_date)).getTime() <
    startOfDay(referenceDate).getTime()
  );
};

export const sortLotsByFefoFifo = (lots: IInventoryLot[]): IInventoryLot[] => {
  return [...lots].sort((leftLot, rightLot) => {
    const expirationDiff =
      toComparableDate(leftLot.expiration_date) -
      toComparableDate(rightLot.expiration_date);

    if (expirationDiff !== 0) {
      return expirationDiff;
    }

    return (
      new Date(leftLot.created_at).getTime() -
      new Date(rightLot.created_at).getTime()
    );
  });
};
