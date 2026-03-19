const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const { Prisma } = require("@prisma/client");

const prisma = new PrismaClient();
const SCRYPT_KEYLEN = 64;

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, SCRYPT_KEYLEN, (error, key) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(key);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt);
  return `${salt}:${derived.toString("hex")}`;
}

async function upsertAdminUser() {
  const email = (process.env.SEED_ADMIN_EMAIL || "ti@cfcontabilidade.com").trim().toLowerCase();
  const password = (process.env.SEED_ADMIN_PASSWORD || "Sup0rt3.@r00t").trim();
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD sao obrigatorios.");
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      active: true,
    },
    update: {
      passwordHash,
      active: true,
    },
  });

  await prisma.userModuleAccess.deleteMany({ where: { userId: user.id } });
  await prisma.userModuleAccess.createMany({
    data: [
      { userId: user.id, module: "SENHA", canRead: true, canWrite: true },
      { userId: user.id, module: "CERTIFICADOS", canRead: true, canWrite: true },
      { userId: user.id, module: "FINANCEIRO", canRead: true, canWrite: true },
      { userId: user.id, module: "USUARIOS", canRead: true, canWrite: true },
    ],
  });

  return user.email;
}

async function upsertEmailServers() {
  const list = [
    { uniqueName: "Time Is Money", requiresCollaboratorEmail: false, cost: "0.000001" },
    { uniqueName: "CFCONTABILIDADE.COM", requiresCollaboratorEmail: true, cost: "0.000001" },
    { uniqueName: "CFCONTABILIDADE.COM.BR", requiresCollaboratorEmail: true, cost: "0.000001" },
  ];
  for (const item of list) {
    await prisma.emailServer.upsert({
      where: { name: item.uniqueName },
      create: {
        name: item.uniqueName,
        costPerEmail: new Prisma.Decimal(item.cost),
        requiresCollaboratorEmail: item.requiresCollaboratorEmail,
        active: true,
      },
      update: {
        requiresCollaboratorEmail: item.requiresCollaboratorEmail,
        active: true,
      },
    });
  }
  console.log("Servicos de e-mail (3) verificados/atualizados.");
}

async function main() {
  await upsertEmailServers();
  const seededEmail = await upsertAdminUser();
  console.log(`Seed concluido. Usuario inicial: ${seededEmail}`);
}

main()
  .catch((error) => {
    console.error("Erro ao executar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
