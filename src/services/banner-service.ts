import { Types } from "mongoose";
import { Banner } from "../models/Banner.js";
import type { IBannerProps } from "../models/Banner.js";
import type { IBannerCondition } from "../models/Banner.js";

export interface BannerInput {
  slot: string;
  type: string;
  priority?: number;
  conditions?: IBannerCondition[];
  props: IBannerProps;
  active?: boolean;
}

export class BannerNotFoundError extends Error {
  constructor() {
    super("Banner not found");
    this.name = "BannerNotFoundError";
  }
}

/** Configuración pública activa (lo que consume la app), por prioridad desc. */
export async function listPublicBanners() {
  return Banner.find({ active: true })
    .sort({ priority: -1, createdAt: -1 })
    .lean();
}

export async function listAllBanners() {
  return Banner.find().sort({ priority: -1, createdAt: -1 }).lean();
}

export async function createBanner(input: BannerInput) {
  const banner = await Banner.create({
    slot: input.slot,
    type: input.type,
    priority: input.priority ?? 0,
    conditions: input.conditions ?? [],
    props: input.props,
    active: input.active ?? true,
  });
  return banner.toObject();
}

export async function updateBanner(id: string, input: BannerInput) {
  const $set: Record<string, unknown> = {
    slot: input.slot,
    type: input.type,
    priority: input.priority ?? 0,
    conditions: input.conditions ?? [],
    props: input.props,
    active: input.active ?? true,
  };
  const banner = await Banner.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set },
    { returnDocument: "after", runValidators: true },
  ).lean();
  if (!banner) throw new BannerNotFoundError();
  return banner;
}

export async function deleteBanner(id: string) {
  const res = await Banner.findOneAndDelete({ _id: new Types.ObjectId(id) }).lean();
  if (!res) throw new BannerNotFoundError();
  return res;
}

export async function setBannerActive(id: string, active: boolean) {
  const banner = await Banner.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set: { active } },
    { returnDocument: "after" },
  ).lean();
  if (!banner) throw new BannerNotFoundError();
  return banner;
}
