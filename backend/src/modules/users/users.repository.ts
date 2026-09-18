import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  /** Members of a family — always scoped, never a global list of users. */
  listMembers(familyId: string) {
    return this.prisma.user.findMany({
      where: { familyId },
      select: { id: true, name: true, email: true, color: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  countInFamily(familyId: string) {
    return this.prisma.user.count({ where: { familyId } });
  }

  setFamily(userId: string, familyId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { familyId } });
  }

  touchLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  updatePassword(userId: string, passwordHash: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  updateName(userId: string, name: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { name } });
  }
}
