import bcrypt from "bcrypt";
import { Types } from "mongoose";
import { User } from "../models/User.js";
import type {
  CreateAgentInput,
  UpdateUserInput,
  UpdateUserStatusInput,
} from "../schemas/user-schema.js";

const AGENT_ROLE = "AGENT";

interface GetUsersInput {
  tenantId: string;
  page: number;
  limit: number;
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
}

function assertValidId(id: string, field = "id"): void {
  if (!Types.ObjectId.isValid(id)) {
    throw new Error(`Invalid ${field}`);
  }
}

async function assertEmailAvailable(
  tenantId: string,
  email: string,
  excludeUserId?: string,
): Promise<void> {
  const filter: Record<string, unknown> = {
    tenantId,
    email: email.toLowerCase(),
  };

  if (excludeUserId) {
    filter._id = {
      $ne: new Types.ObjectId(excludeUserId),
    };
  }

  const existingUser = await User.findOne(filter);

  if (existingUser) {
    throw new Error("A user with this email already exists");
  }
}

export async function createAgent(input: CreateAgentInput, tenantId: string) {
  await assertEmailAvailable(tenantId, input.email);

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await User.create({
    tenantId,
    name: input.name,
    email: input.email.toLowerCase(),
    passwordHash,
    role: AGENT_ROLE,
    status: "ACTIVE",
  });

  return user.toObject();
}

export async function getUsers(input: GetUsersInput) {
  const { tenantId, page, limit, search, status, dateFrom, dateTo } = input;

  assertValidId(tenantId, "tenantId");

  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
    role: AGENT_ROLE,
  };

  if (search?.trim()) {
    const searchRegex = new RegExp(search.trim(), "i");

    filter.$or = [
      { name: searchRegex },
      { email: searchRegex },
    ];
  }

  if (status) {
    filter.status = status;
  }

  const createdAtFilter: Record<string, Date> = {};

  if (dateFrom) {
    createdAtFilter.$gte = new Date(`${dateFrom}T00:00:00.000Z`);
  }

  if (dateTo) {
    createdAtFilter.$lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  if (Object.keys(createdAtFilter).length > 0) {
    filter.createdAt = createdAtFilter;
  }

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    User.find(filter)
      .select("-passwordHash")
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit)
      .lean(),

    User.countDocuments(filter),
  ]);

  const pages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

export async function getUserById(tenantId: string, userId: string) {
  assertValidId(tenantId, "tenantId");
  assertValidId(userId, "userId");

  const user = await User.findOne({
    _id: new Types.ObjectId(userId),
    tenantId: new Types.ObjectId(tenantId),
    role: AGENT_ROLE,
  })
    .select("-passwordHash")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function updateUser(
  tenantId: string,
  userId: string,
  input: UpdateUserInput,
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(userId, "userId");

  const update: Record<string, unknown> = {};

  if (input.name) {
    update.name = input.name;
  }

  if (input.email) {
    const email = input.email.toLowerCase();

    await assertEmailAvailable(tenantId, email, userId);

    update.email = email;
  }

  if (input.password) {
    update.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const user = await User.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      role: AGENT_ROLE,
    },
    update,
    {
      returnDocument: "after",
      runValidators: true,
    },
  )
    .select("-passwordHash")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function updateUserStatus(
  tenantId: string,
  userId: string,
  status: UpdateUserStatusInput["status"],
) {
  assertValidId(tenantId, "tenantId");
  assertValidId(userId, "userId");

  const user = await User.findOneAndUpdate(
    {
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
      role: AGENT_ROLE,
    },
    {
      status,
    },
    {
      returnDocument: "after",
      runValidators: true,
    },
  )
    .select("-passwordHash")
    .lean();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function deleteUser(tenantId: string, userId: string) {
  assertValidId(tenantId, "tenantId");
  assertValidId(userId, "userId");

  const user = await User.findOneAndDelete({
    _id: new Types.ObjectId(userId),
    tenantId: new Types.ObjectId(tenantId),
    role: AGENT_ROLE,
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: userId,
  };
}
